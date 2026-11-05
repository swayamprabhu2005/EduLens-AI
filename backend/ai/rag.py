import os
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(dotenv_path=dotenv_path)

class MeetingRAG:
    def __init__(self):
        print("Initializing Local AI Models (Speech Recognition & Vector DB)...")
        
        self.transcriber = None
        self.embedder = None
        self.chroma_client = None
        self.collection = None
        self.nvidia_client = None
        
        # 1. Local Whisper Model
        try:
            from transformers import pipeline
            self.transcriber = pipeline(
                "automatic-speech-recognition", 
                model="openai/whisper-tiny",
                device="cpu"
            )
            print("Whisper Tiny Loaded!")
        except Exception as e:
            print(f"Warning: Whisper model could not be loaded ({e})")
            
        # 2. Local Embedding Model
        try:
            from sentence_transformers import SentenceTransformer
            self.embedder = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
            print("SentenceTransformer (MiniLM) Loaded!")
        except Exception as e:
            print(f"Warning: SentenceTransformer could not be loaded ({e})")

        # 3. Vector Database (ChromaDB)
        try:
            import chromadb
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
            self.chroma_client = chromadb.PersistentClient(path=db_path)
            self.collection = self.chroma_client.get_or_create_collection(name="meeting_transcripts")
            print("ChromaDB Client Connected!")
        except Exception as e:
            print(f"Warning: ChromaDB could not be initialized ({e})")

        # 4. NVIDIA LLM Client (Gemma)
        api_key = os.environ.get("NVIDIA_API_KEY")
        if api_key:
            try:
                from openai import OpenAI
                self.nvidia_client = OpenAI(
                    base_url="https://integrate.api.nvidia.com/v1",
                    api_key=api_key
                )
                print("NVIDIA LLM Client Loaded!")
            except Exception as e:
                print(f"Warning: Failed to initialize OpenAI client for NVIDIA NIM: {e}")
                self.nvidia_client = None
        else:
            print("Notice: NVIDIA_API_KEY not set. AI summaries will use extractive heuristic fallback.")

    def process_audio(self, audio_filepath, session_id):
        """
        Transcribes audio, splits into semantic chunks with timestamp metadata,
        and indexes chunks into the vector store.
        """
        print(f"Transcribing audio for session {session_id} from {audio_filepath}...")
        
        if not self.transcriber:
            raise RuntimeError("Whisper speech recognizer is not available on this system.")
            
        # Transcribe audio file
        result = self.transcriber(audio_filepath, chunk_length_s=30)
        full_text = result.get("text", "").strip()
        
        if not full_text:
            return "No clear speech detected in the audio file."
            
        # Semantic chunking (approx 60 words per chunk with overlap)
        words = full_text.split()
        chunk_size = 60
        overlap = 10
        chunks = []
        
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i+chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
            
        if not chunks:
            chunks = [full_text]
            
        # Save to Vector Database if available
        if self.collection and self.embedder:
            print(f"Indexing {len(chunks)} chunks to Vector Database...")
            for idx, chunk in enumerate(chunks):
                approx_time_min = round((idx * 20) / 60, 1) # estimated minute in class
                vector = self.embedder.encode(chunk).tolist()
                
                self.collection.upsert(
                    embeddings=[vector],
                    documents=[chunk],
                    metadatas=[{
                        "session_id": str(session_id),
                        "chunk_index": idx,
                        "timestamp_approx_min": approx_time_min
                    }],
                    ids=[f"{session_id}_chunk_{idx}"]
                )
                
        return full_text

    def search_transcript(self, session_id: str, query: str, top_k: int = 4):
        """
        Performs true semantic vector search over the lecture transcript in ChromaDB.
        """
        if not self.collection or not self.embedder:
            return []
            
        query_vector = self.embedder.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            where={"session_id": str(session_id)}
        )
        
        matches = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            for doc, meta, distance in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0] if "distances" in results and results["distances"] else [0]*len(results["documents"][0])
            ):
                matches.append({
                    "text": doc,
                    "metadata": meta,
                    "relevance_score": round(1.0 - (distance if distance is not None else 0), 3)
                })
        return matches

    def ask_question(self, session_id: str, question: str):
        """
        Interactive Lecture Q&A: Uses semantic retrieval to find relevant excerpts
        and answers the question via Gemma-2.
        """
        # 1. Semantic vector search for relevant excerpts
        matches = self.search_transcript(session_id, question, top_k=4)
        
        if not matches:
            # Fallback to full document if vector search returned nothing
            results = self.collection.get(where={"session_id": str(session_id)}) if self.collection else None
            if not results or not results.get("documents"):
                return "No transcript or relevant excerpts found for this session to answer your question."
            context = " ".join(results["documents"][:5])
        else:
            context = "\n---\n".join([f"[Excerpt ~{m['metadata'].get('timestamp_approx_min', 0)}m]: {m['text']}" for m in matches])
            
        if not self.nvidia_client:
            return f"Retrieved relevant lecture excerpts:\n\n{context}\n\n(Configure NVIDIA_API_KEY in .env for generative conversational answers)."
            
        prompt = f"""You are an expert AI teaching assistant for this class lecture.
Answer the user's question accurately and concisely using ONLY the following lecture excerpts.
If the answer is not contained in the excerpts, clearly state that it was not covered in these parts of the class.

Question: {question}

Lecture Excerpts:
{context}

Answer:"""

        try:
            response = self.nvidia_client.chat.completions.create(
                model="google/gemma-2-9b-it",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=600
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error querying NVIDIA NIM LLM: {e}\n\nTop excerpts found:\n{context}"

    def generate_summary(self, session_id: str):
        """
        Finds transcript pieces and produces a structured lecture summary.
        Uses Python-native Map-Reduce for long lectures to stay within token limits.
        """
        if not self.collection:
            return "Vector database is not initialized."
            
        results = self.collection.get(where={"session_id": str(session_id)})
        
        if not results or not results.get('documents') or len(results['documents']) == 0:
            return "No transcript found for this session. Please upload or record class audio first."
            
        documents = results['documents']
        full_context = " ".join(documents)
        word_count = len(full_context.split())
        
        if not self.nvidia_client:
            # Extractive fallback summary
            sentences = full_context.split(". ")
            key_points = sentences[:min(5, len(sentences))]
            return (
                "**Class Transcript Summary (Offline Mode)**\n\n"
                f"• Total spoken segments recorded: {len(documents)}\n"
                f"• Estimated word count: {word_count} words\n\n"
                "**Key Excerpts:**\n" + "\n".join([f"- {s.strip()}." for s in key_points if s.strip()]) +
                "\n\n*(Set NVIDIA_API_KEY in .env to enable generative Gemma-2 lecture synthesis)*"
            )

        # Map-Reduce Pattern if transcript is large (> 1,200 words)
        if word_count > 1200 and len(documents) > 4:
            print(f"Applying Python Map-Reduce for long lecture ({word_count} words)...")
            
            # Map step: Summarize blocks of 4 chunks
            block_size = 4
            intermediate_summaries = []
            
            for b_idx in range(0, len(documents), block_size):
                block_text = " ".join(documents[b_idx:b_idx+block_size])
                map_prompt = f"""Summarize the key ideas, explanations, and instructions from this segment of a class lecture:
Segment text:
{block_text}
Brief notes:"""
                try:
                    resp = self.nvidia_client.chat.completions.create(
                        model="google/gemma-2-9b-it",
                        messages=[{"role": "user", "content": map_prompt}],
                        temperature=0.2,
                        max_tokens=350
                    )
                    intermediate_summaries.append(resp.choices[0].message.content)
                except Exception as map_err:
                    print(f"Map step block error: {map_err}")
                    intermediate_summaries.append(block_text[:300])
                    
            combined_notes = "\n\n".join(intermediate_summaries)
            
            # Reduce step: Combine intermediate notes into final structured report
            reduce_prompt = f"""You are a professional educational teaching assistant.
Based on the following segment notes taken during the lecture, produce a comprehensive, well-structured master report:

1. **Executive Class Overview**: High-level synthesis of what was taught today.
2. **Core Concepts & Key Topics**: Detailed bulleted breakdown of subject matter explained.
3. **Important Instructions & Homework / Action Items**: Any tasks, reading, or homework assigned.
4. **Questions & Discussion Points**: Key questions raised or critical takeaways.

Segment Notes:
{combined_notes}
"""
            reduce_response = self.nvidia_client.chat.completions.create(
                model="google/gemma-2-9b-it",
                messages=[{"role": "user", "content": reduce_prompt}],
                temperature=0.3,
                max_tokens=1024
            )
            return reduce_response.choices[0].message.content

        else:
            # Direct single-pass prompt for moderate length lectures
            prompt = f"""You are a professional teacher's assistant. Based on the following lecture transcript, 
please generate a clean, formatted report including:
1. **Class Summary**: Brief overview of the class.
2. **Key Topics Discussed**: Core educational points.
3. **Action Items & Homework**: Tasks or next steps for students.

Transcript: {full_context}
"""
            response = self.nvidia_client.chat.completions.create(
                model="google/gemma-2-9b-it",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1024
            )
            return response.choices[0].message.content
