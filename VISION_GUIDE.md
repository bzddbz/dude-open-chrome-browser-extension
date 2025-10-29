# 🖼️ Vision Feature - Usage Guide

## Setup (Jan AI)

### 1. Install Vision Model in Jan

Open Jan → Models → Search:
```
qwen2.5-vl:7b-instruct-q4_k_m
```

Or smaller version:
```
qwen2.5-vl:3b-instruct-q4_k_m  (~2GB)
```

### 2. Configure Dude Extension

Settings → OpenAI-compatible Provider:
- ✅ Enable OpenAI-compatible Provider
- Provider Type: `custom` (or `jan`)
- Base URL: `http://localhost:1337` (Jan default)
- Model Name: `qwen2.5-vl:7b-instruct-q4_k_m`
- API Key: (leave empty for Jan)

### 3. Verify Jan is Running

Check Jan status bar:
- ✅ Model loaded
- ✅ Server running on port 1337

---

## 📸 Using Vision Feature

### Basic Screen Analysis

1. Navigate to any webpage
2. Open Dude sidebar (Ctrl+Shift+Y)
3. Click the **👁️ Analyze Screen** button (new vision icon)
4. Wait for screenshot capture
5. See AI analysis of what's on screen

### Custom Questions

1. Type question in the **Custom Prompt** input:
   - "What UI components are on this page?"
   - "Summarize the chart in Hungarian"
   - "What text is visible in this image?"
2. Click **👁️ Analyze Screen**
3. Get answer specific to your question

---

## 🎯 Use Cases

### 1. **Screenshot OCR**
```
Question: "Extract all text from this screen"
Result: Complete text transcription
```

### 2. **Chart/Graph Analysis**
```
Question: "Explain this chart and its key insights"
Result: Detailed chart interpretation
```

### 3. **UI Analysis**
```
Question: "Describe the layout of this webpage"
Result: UI component breakdown
```

### 4. **Meme/Image Understanding**
```
Question: "What's the joke in this image?"
Result: Humor explanation
```

### 5. **Design Feedback**
```
Question: "How could this design be improved?"
Result: UX/UI suggestions
```

---

## ⚙️ Technical Details

### Screenshot Format
- **Format**: PNG (base64 data URI)
- **Captures**: Visible viewport only
- **Size**: ~500KB-2MB typical

### Performance
- **Screenshot**: ~100-200ms
- **Upload**: Instant (local)
- **Analysis**: 2-5 seconds (depends on model)
- **Total**: ~3-7 seconds

### Privacy
- ✅ **100% Local** - No data leaves your machine
- ✅ **No cloud upload** - Screenshots stay in memory
- ✅ **Secure** - Jan runs on localhost only

---

## 🐛 Troubleshooting

### "Vision analysis requires OpenAI-compatible provider"
**Solution**: Enable OpenAI-compatible in settings and install vision model

### "Failed to capture screenshot"
**Solution**: 
- Check browser permissions
- Reload extension
- Try different tab

### "Request timeout"
**Solution**:
- Vision models are slower
- Wait 10-15 seconds for large images
- Use smaller model (3B instead of 7B)

### Jan not responding
**Solution**:
- Check Jan is running
- Verify port 1337 is correct
- Restart Jan application

---

## 🚀 Future Enhancements

- [ ] Full page screenshot (with scrolling)
- [ ] Upload image from file
- [ ] Paste image from clipboard
- [ ] Multiple image analysis
- [ ] Video frame extraction
- [ ] OCR-specific optimization

---

## 📝 Model Recommendations

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **qwen2.5-vl:3b** | ~2GB | ⚡⚡⚡ | ⭐⭐⭐ | Quick OCR |
| **qwen2.5-vl:7b** | ~5GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Detailed analysis |
| **llava:7b** | ~4GB | ⚡⚡ | ⭐⭐⭐⭐ | Alternative |
| **bakllava:7b** | ~4GB | ⚡⚡ | ⭐⭐⭐⭐ | OCR focused |

**Recommended for Dude**: `qwen2.5-vl:7b-instruct-q4_k_m` (best quality/size)

---

Enjoy the vision feature! 🎉
