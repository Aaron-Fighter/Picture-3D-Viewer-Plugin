### CSS3DViewer for RPG Maker MV
A lightweight and interactive 3D image viewer plugin for RPG Maker MV. This plugin allows you to display an image on the screen that players can click and drag to rotate in a 3D space. <br>
It is perfect for inspecting items, viewing character portraits, or showing off detailed artwork in your game! <br>

### ✨ Features
1. **3D Image Inspection**: Display an image that players can freely rotate by clicking and dragging.
2. **Event Pausing**: Automatically pauses the current event execution until the player closes the viewer.
3. **Easy to Use**: Automatically detects image formats (PNG, JPG, etc.) so you don't need to type file extensions. Adjusting image size and background opacity can be done easily via the Plugin Manager.

### 📦 Installation
1. Download `CSS3DViewer.js` and place it in your project's `js/plugins/ folder`.
2. Open RPG Maker MV, go to the **Plugin Manager**, and enable `CSS3DViewer`.
3. (Optional) Adjust the plugin parameters (Scale Ratio & Background Opacity).
4. Place your images inside the `img/pictures/` folder.

### 🚀 Usage
Use the Plugin Command inside your events to open the viewer:
```bash
Open3DViewer [ImageName]
```

*(Example: `Open3DViewer Card01` or `Open3DViewer Item.png`)*

**Player Controls:**<br>
+ Left Click & Drag - Rotate the image.<br>
+ Right Click / ESC Key - Close the viewer.<br>

### 📄 License
Free to use in both non-commercial and commercial projects. Credit to **Aaron Gao and Donovan Yuan** is appreciated!