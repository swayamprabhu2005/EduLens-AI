import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import os
import cv2
from .model import MultiTaskEngagementCNN

class EngagementAI:
    def __init__(self, model_path="multi_task_cnn_epoch_15.pth"):
        # Automatically use GPU if available, otherwise use CPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading custom AI model on: {self.device}")
        
        # Initialize the architecture
        self.model = MultiTaskEngagementCNN().to(self.device)
        
        # Determine absolute path to the weights file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        full_model_path = os.path.join(current_dir, model_path)
        
        if not os.path.exists(full_model_path):
            raise FileNotFoundError(f"Could not find model weights at {full_model_path}")
            
        # Load the trained weights
        self.model.load_state_dict(torch.load(full_model_path, map_location=self.device))
        self.model.eval() # Set to evaluation mode (disables dropout, etc.)
        
        # The exact same transformations we used during training
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # Map numerical outputs back to human-readable strings
        self.engagement_classes = {0: 'Very Low', 1: 'Low', 2: 'High', 3: 'Very High'}
        self.emotion_classes = {0: 'Happy', 1: 'Sad', 2: 'Anger', 3: 'Fear', 
                                4: 'Neutral', 5: 'Disgust', 6: 'Surprise', 7: 'Contempt'}

    def analyze(self, frame):
        """
        Takes an OpenCV BGR frame (from WebSockets), runs it through the CNN,
        and returns Engagement and Emotion predictions.
        """
        try:
            # 1. Convert OpenCV BGR image to RGB format for the AI
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(rgb_frame)
            
            # 2. Apply transforms and add batch dimension (Batch=1)
            input_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
            
            # 3. Run it through the neural network
            with torch.no_grad():
                engagement_out, emotion_out = self.model(input_tensor)
                
                # Get the index with the highest confidence
                eng_idx = torch.argmax(engagement_out, dim=1).item()
                emo_idx = torch.argmax(emotion_out, dim=1).item()
                
            return {
                "attention_status": self.engagement_classes[eng_idx],
                "emotion": self.emotion_classes[emo_idx],
                "success": True
            }
        except Exception as e:
            print(f"Inference error: {e}")
            return {
                "attention_status": "Unknown",
                "emotion": "Unknown",
                "success": False
            }
