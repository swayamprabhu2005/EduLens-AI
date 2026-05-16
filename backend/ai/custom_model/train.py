import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from model import MultiTaskEngagementCNN
import os
import random
import cv2
import pandas as pd
from PIL import Image

"""
=============================================================================
GOOGLE COLAB SETUP INSTRUCTIONS
=============================================================================
Before running this script in Colab, you need to download the datasets.
Since DAiSEE and AffectNet are large, the best way is using the Kaggle API.

1. In your Colab Notebook, create a new cell at the top and paste this:
   import os
   os.environ['KAGGLE_API_TOKEN'] = "PASTE_YOUR_KGAT_TOKEN_HERE"

2. In the next cell, download the datasets:
   !kaggle datasets download -d olgaparfenova/daisee
   !kaggle datasets download -d mstjebashazida/affectnet
   
3. Unzip them:
   !unzip -q daisee.zip -d /content/daisee
   !unzip -q affectnet.zip -d /content/affectnet
=============================================================================
"""

# 1. DAiSEE Dataset Loader (Engagement)
class DaiseeDataset(Dataset):
    def __init__(self, data_dir, transform=None, use_percentage=0.5):
        self.transform = transform
        self.image_paths = []
        self.labels = []
        
        # Look for processed frames directory first
        processed_dir = '/content/daisee_processed'
        
        if not os.path.exists(processed_dir):
            print("Processing DAiSEE videos into frames... this will take a few minutes.")
            os.makedirs(processed_dir, exist_ok=True)
            
            # Paths inside DAiSEE
            dataset_path = os.path.join(data_dir, 'DataSet')
            labels_dir = os.path.join(data_dir, 'Labels')
            
            # Find the labels CSV
            csv_path = None
            if os.path.exists(labels_dir):
                for f in os.listdir(labels_dir):
                    if f.endswith('.csv') and 'Train' in f:
                        csv_path = os.path.join(labels_dir, f)
                        break
            
            if csv_path:
                df = pd.read_csv(csv_path)
                # Ensure we have the right columns
                if 'Engagement' in df.columns and 'ClipID' in df.columns:
                    for idx, row in df.iterrows():
                        clip_id = str(row['ClipID'])
                        if not clip_id.endswith('.avi') and not clip_id.endswith('.mp4'):
                            clip_id += '.avi' # DAiSEE usually uses avi or mp4
                            
                        engagement_label = int(row['Engagement']) # 0, 1, 2, 3
                        
                        # Find the video file recursively
                        video_path = None
                        for root, dirs, files in os.walk(dataset_path):
                            if clip_id in files:
                                video_path = os.path.join(root, clip_id)
                                break
                                
                        if video_path:
                            # Extract 1 frame from the middle of the video
                            cap = cv2.VideoCapture(video_path)
                            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                            if total_frames > 0:
                                cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2)
                                ret, frame = cap.read()
                                if ret:
                                    save_path = os.path.join(processed_dir, f"{engagement_label}_{idx}.jpg")
                                    cv2.imwrite(save_path, frame)
                            cap.release()
            print("DAiSEE processing complete!")

        # Now load from processed_dir
        all_samples = []
        if os.path.exists(processed_dir):
            for img_name in os.listdir(processed_dir):
                if img_name.endswith('.jpg'):
                    # Filename format: {label}_{idx}.jpg
                    label = int(img_name.split('_')[0])
                    all_samples.append((os.path.join(processed_dir, img_name), label))
                            
        # Shuffle and take percentage
        random.shuffle(all_samples)
        num_samples = int(len(all_samples) * use_percentage)
        all_samples = all_samples[:num_samples]
        
        self.image_paths = [s[0] for s in all_samples]
        self.labels = [s[1] for s in all_samples]

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label

# 2. AffectNet Dataset Loader (Emotions)
class AffectNetDataset(Dataset):
    def __init__(self, data_dir, transform=None):
        self.transform = transform
        self.image_paths = []
        self.labels = []
        
        # 8 Emotion classes matching the Kaggle screenshot exact folder names
        classes = {'happy': 0, 'sad': 1, 'anger': 2, 'fear': 3, 
                   'neutral': 4, 'disgust': 5, 'surprise': 6, 'contempt': 7}
        
        if os.path.exists(data_dir):
            for cls_name, cls_idx in classes.items():
                cls_dir = os.path.join(data_dir, cls_name)
                if os.path.exists(cls_dir):
                    for img_name in os.listdir(cls_dir):
                        if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                            self.image_paths.append(os.path.join(cls_dir, img_name))
                            self.labels.append(cls_idx)

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        label = self.labels[idx]
        if self.transform:
            image = self.transform(image)
        return image, label

# 3. Main Training Function (Multi-Task Alternating Batches)
def train_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Hyperparameters
    batch_size = 32
    learning_rate = 0.001
    num_epochs = 15
    
    # Standard augmentation for facial images
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Initialize Datasets
    # Auto-detect actual paths based on extraction (handles weird zip structures like 'archive (3)')
    daisee_dir = '/content/daisee/DAiSEE'
    
    affectnet_dir = '/content/affectnet'
    # Look for the 'Train' folder inside affectnet recursively
    for root, dirs, files in os.walk('/content/affectnet'):
        if 'Train' in dirs or 'train' in dirs:
            affectnet_dir = os.path.join(root, 'Train' if 'Train' in dirs else 'train')
            break
    
    daisee_dataset = DaiseeDataset(data_dir=daisee_dir, transform=transform, use_percentage=0.5)
    affectnet_dataset = AffectNetDataset(data_dir=affectnet_dir, transform=transform)
    
    if len(daisee_dataset) == 0 or len(affectnet_dataset) == 0:
        print("Warning: One or both datasets are empty. Please check your extraction paths.")
        return
        
    print(f"Loaded {len(daisee_dataset)} DAiSEE images (50%) and {len(affectnet_dataset)} AffectNet images.")
    
    daisee_loader = DataLoader(daisee_dataset, batch_size=batch_size, shuffle=True)
    affectnet_loader = DataLoader(affectnet_dataset, batch_size=batch_size, shuffle=True)
    
    # Initialize Model, Loss Functions, and Optimizer
    model = MultiTaskEngagementCNN(num_engagement_classes=4, num_emotion_classes=8).to(device)
    
    criterion_engagement = nn.CrossEntropyLoss()
    criterion_emotion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    
    # Alternating Batch Training Loop
    for epoch in range(num_epochs):
        model.train()
        total_loss = 0.0
        
        # Convert loaders to iterators
        iter_daisee = iter(daisee_loader)
        iter_affectnet = iter(affectnet_loader)
        
        num_batches = min(len(daisee_loader), len(affectnet_loader))
        
        for i in range(num_batches):
            optimizer.zero_grad()
            
            # --- 1. Train on DAiSEE (Engagement Head) ---
            imgs_d, labels_d = next(iter_daisee)
            imgs_d, labels_d = imgs_d.to(device), labels_d.to(device)
            
            eng_out, _ = model(imgs_d) # Ignore emotion output for DAiSEE
            loss_d = criterion_engagement(eng_out, labels_d)
            loss_d.backward()
            
            # --- 2. Train on AffectNet (Emotion Head) ---
            imgs_a, labels_a = next(iter_affectnet)
            imgs_a, labels_a = imgs_a.to(device), labels_a.to(device)
            
            _, emo_out = model(imgs_a) # Ignore engagement output for AffectNet
            loss_a = criterion_emotion(emo_out, labels_a)
            loss_a.backward()
            
            # Update weights for both passes
            optimizer.step()
            
            total_loss += (loss_d.item() + loss_a.item())
            
        avg_loss = total_loss / (num_batches * 2)
        print(f"Epoch [{epoch+1}/{num_epochs}] | Average Multi-Task Loss: {avg_loss:.4f}")
        
        # Save Model Weights after every epoch to Google Drive
        save_dir = '/content/drive/MyDrive/EngagementModel'
        os.makedirs(save_dir, exist_ok=True)
        epoch_save_path = os.path.join(save_dir, f'multi_task_cnn_epoch_{epoch+1}.pth')
        torch.save(model.state_dict(), epoch_save_path)
        print(f"Saved checkpoint to: {epoch_save_path}")

    print("Training completely finished!")

if __name__ == "__main__":
    train_model()
