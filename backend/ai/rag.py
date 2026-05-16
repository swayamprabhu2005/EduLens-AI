import os
import chromadb
from transformers import pipeline
from sentence_transformers import SentenceTransformer
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (like NVIDIA_API_KEY)
load_dotenv()

class MeetingRAG:
    def __init__(self):
        print("Initializing Local AI Models (This will download them on the very first run)...")
        
        # 1. Local Whisper Model (Tiny version - fits in 4GB RAM)
        # HuggingFace will automatically download this to your hidden ~/.cache/huggingface folder
        self.transcriber = pipeline(
            "automatic-speech-recognition", 
            model="openai/whisper-tiny",
            device="cpu" # Force CPU to save your limited RAM
        )
        print("Whisper Tiny Loaded!")

        # 2. Local Embedding Model (for the Vector Database)
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        print("MiniLM Loaded!")

        # 3. Vector Database (ChromaDB)
        # We store the database files locally in the PS2/database folder
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
        self.chroma_client = chromadb.PersistentClient(path=db_path)
        self.collection = self.chroma_client.get_or_create_collection(name="meeting_transcripts")

        # 4. NVIDIA LLM Client (Gemma)
        self.nvidia_client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY")
        )

    def process_audio(self, audio_filepath, session_id):
        """
        Takes an audio file, transcribes it, chops it into pieces, and saves it to the Database.
        """
        print(f"Transcribing audio for session {session_id}...")
        
        # 1. Transcribe
        result = self.transcriber(audio_filepath, chunk_length_s=30)
        full_text = result["text"]
        
        # 2. Chop into paragraphs (rudimentary chunking)
        words = full_text.split()
        chunks = [' '.join(words[i:i+50]) for i in range(0, len(words), 50)]
        
        # 3. Save to Vector Database
        print("Saving to Vector Database...")
        for i, chunk in enumerate(chunks):
            # Convert text to numbers
            vector = self.embedder.encode(chunk).tolist()
            
            # Save to ChromaDB
            self.collection.add(
                embeddings=[vector],
                documents=[chunk],
                metadatas=[{"session_id": session_id}],
                ids=[f"{session_id}_chunk_{i}"]
            )
        
        return full_text

    def generate_summary(self, session_id):
        """
        Finds all transcript pieces for a session and asks Gemma to write a professional summary.
        """
        # 1. Retrieve all chunks for this session from the database
        results = self.collection.get(
            where={"session_id": session_id}
        )
        
        if not results['documents']:
            return "No transcript found for this session."
            
        full_context = " ".join(results['documents'])
        
        # 2. Ask the NVIDIA Endpoint (Gemma) to write the summary
        print("Sending to NVIDIA Gemma Endpoint...")
        prompt = f"""
        You are a professional teacher's assistant. Based on the following meeting transcript, 
        please generate a clean, formatted report including:
        1. A brief summary of the class.
        2. Key topics discussed.
        3. Action items or homework.
        
        Transcript: {full_context}
        """
        
        response = self.nvidia_client.chat.completions.create(
            model="google/gemma-2-9b-it", # standard NIM Gemma identifier
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1024
        )
        
        return response.choices[0].message.content
