import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import os
import cv2
from .model import MultiTaskEngagementCNN

class EngagementAI:
    def __init__(self, model_path="multi_task_cnn_epoch_15.pth"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading custom AI model on: {self.device}")
        
        # Initialize architecture
        self.model = MultiTaskEngagementCNN().to(self.device)
        self.is_fallback = False
        
        # Determine path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        full_model_path = os.path.join(current_dir, model_path)
        
        if os.path.exists(full_model_path):
            try:
                state_dict = torch.load(full_model_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.model.eval()
                print(f"Loaded weights from {full_model_path}")
            except Exception as e:
                print(f"Failed to load weights ({e}). Activating heuristic fallback mode.")
                self.is_fallback = True
        else:
            print(f"Weights not found at {full_model_path}. Activating heuristic fallback mode.")
            self.is_fallback = True
            
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.engagement_classes = {0: 'Very Low', 1: 'Low', 2: 'High', 3: 'Very High'}
        self.emotion_classes = {
            0: 'Happy', 1: 'Sad', 2: 'Anger', 3: 'Fear',
            4: 'Neutral', 5: 'Disgust', 6: 'Surprise', 7: 'Contempt'
        }

    def analyze(self, frame):
        """
        Takes an OpenCV BGR frame, runs inference or fallback, and returns
        structured predictions.
        """
        if frame is None or frame.size == 0:
            return {"attention_status": "Low", "emotion": "Neutral", "success": False}

        try:
            if not self.is_fallback:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)
                input_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    engagement_out, emotion_out = self.model(input_tensor)
                    eng_idx = torch.argmax(engagement_out, dim=1).item()
                    emo_idx = torch.argmax(emotion_out, dim=1).item()
                    
                return {
                    "attention_status": self.engagement_classes.get(eng_idx, "High"),
                    "emotion": self.emotion_classes.get(emo_idx, "Neutral"),
                    "success": True
                }
            else:
                # Heuristic fallback using image dynamics
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                mean_val = float(np.mean(gray))
                std_val = float(np.std(gray))
                
                if std_val > 20 and 30 < mean_val < 235:
                    return {
                        "attention_status": "High",
                        "emotion": "Neutral",
                        "success": True
                    }
                else:
                    return {
                        "attention_status": "Very Low",
                        "emotion": "Neutral",
                        "success": True
                    }
        except Exception as e:
            print(f"Inference error: {e}")
            return {
                "attention_status": "Low",
                "emotion": "Neutral",
                "success": False
            }
