/*:
 * @plugindesc CSS3DViewer
 * @author Aaron Gao & Donovan Yuan
 *
 * @param ScaleRatio
 * @text Picture Scaling
 * @desc The maximum aspect ratio of the image on the screen, for example, 0.8 indicates that it occupies 80% of the screen size.
 * @default 0.8
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 1.0
 * * @param BackgroundOpacity
 * @text Background mask transparency
 * @desc Background mask transparency，0.0 is fully transparent，1.0 is pure black.
 * @default 0.7
 * @type number
 * @decimals 1
 * @min 0.0
 * @max 1.0
 *
 * @help Usage：
 *  1. Put image in `img/pictures/` fold
 *
 *  2. Use plugin order in events：Open3DViewer image_name
 * （For example：Open3DViewer Card01  or  Open3DViewer Card01.png）
 *
 * Attention：
 *  When 3D Viewer open, the event will stop until close viewer
 *  Plugin will find the image in .png, .jpg, .jpeg, .gif, .webp format automatically, so you don't need to label the suffix in plugin order.
 */

(function() {

    const parameters = PluginManager.parameters('CSS3DViewer');
    const scaleRatio = Number(parameters['ScaleRatio'] || 0.8);
    const bgOpacity = Number(parameters['BackgroundOpacity'] || 0.7);

    let currentViewer = null;

    

    Game_Temp.prototype._css3dViewerOpen = false;

    Game_Temp.prototype.isCSS3DViewerOpen = function() {
        return this._css3dViewerOpen;
    };

    Game_Temp.prototype.openCSS3DViewer = function(imagePath) {
        if (currentViewer) currentViewer.close();
        currentViewer = new CSS3DViewer(imagePath);
        this._css3dViewerOpen = true; 
    };

    Game_Temp.prototype.closeCSS3DViewer = function() {
        if (currentViewer) {
            currentViewer.close();
            currentViewer = null;
        }
        this._css3dViewerOpen = false; 
    };


    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'Open3DViewer') {
            $gameTemp.openCSS3DViewer(args[0]);
            this.setWaitMode('css3dViewer'); 
        } 
    };

    const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
    Game_Interpreter.prototype.updateWait = function() {
        if (this._waitMode === 'css3dViewer') {
            if ($gameTemp.isCSS3DViewerOpen()) {
                return true; 
            } else {
                this._waitMode = ''; 
                return false; 
            }
        }
        return _Game_Interpreter_updateWait.call(this);
    };


    // The core of 3D Viewer
    class CSS3DViewer {
        constructor(imagePath) {
            this.imagePathBase = imagePath;
            this.extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
            this.currentExtIndex = 0;

            // Container
            this.container = document.createElement('div');
            this.container.id = 'css3d-viewer-container';
            this.container.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                perspective: 1000px;
                z-index: 1000;
                background-color: rgba(0, 0, 0, ${bgOpacity});
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            // Pictures
            this.imageElement = new Image(); 
            this.imageElement.draggable = false;
            
            this.imageElement.style.cssText = `
                position: absolute;
                display: block;
                transform-style: preserve-3d;
                transition: transform 0.1s ease, opacity 0.3s ease;
                cursor: grab;
                user-select: none;
                opacity: 0;
                -webkit-user-drag: none;
            `;
            
            // Close Button
            this.closeButton = this.createButton('×', '#ff0000', 20);
            this.closeButton.addEventListener('click', () => {
                $gameTemp.closeCSS3DViewer();
            });
            
            this.container.appendChild(this.imageElement);
            this.container.appendChild(this.closeButton);

            document.body.appendChild(this.container);
            
            this.container.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });

            // After load image success 
            this.imageElement.onload = () => {
                this.resizeImage();
                setTimeout(() => {
                    this.container.style.opacity = '1';
                    this.imageElement.style.opacity = '1';
                }, 10);
            };

            this.imageElement.onerror = () => {
                if (this.imagePathBase.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    console.error(`无法加载图片: ${this.imagePathBase} (请检查 img/pictures 文件夹)`);
                    $gameTemp.closeCSS3DViewer();
                } else {
                    
                    this.currentExtIndex++;
                    this.tryLoadImage();
                }
            };
            
            this.setupMouseControl();

            // Begin to load Image
            this.tryLoadImage();
        }

        tryLoadImage() {
            if (this.imagePathBase.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                this.imageElement.src = 'img/pictures/' + this.imagePathBase;
            } else {
                if (this.currentExtIndex < this.extensions.length) {
                    const ext = this.extensions[this.currentExtIndex];
                    this.imageElement.src = 'img/pictures/' + this.imagePathBase + ext;
                } else {
                    console.error(`无法找到图片: ${this.imagePathBase} (尝试了 png, jpg, webp 等格式均失败)`);
                    $gameTemp.closeCSS3DViewer();
                }
            }
        }

        createButton(text, color, rightOffset) {
            const btn = document.createElement('div');
            btn.style.cssText = `
                position: absolute;
                top: 20px;
                right: ${rightOffset}px;
                width: 40px;
                height: 40px;
                background-color: ${color};
                color: white;
                text-align: center;
                line-height: 40px;
                border-radius: 50%;
                cursor: pointer;
                z-index: 1001;
                font-weight: bold;
                font-size: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                transition: transform 0.2s ease, filter 0.2s ease;
            `;
            btn.textContent = text;

            btn.addEventListener('mouseenter', () => {
                btn.style.filter = 'brightness(1.2)';
                btn.style.transform = 'scale(1.1)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.filter = 'brightness(1)';
                btn.style.transform = 'scale(1)';
            });

            return btn;
        }

        resizeImage() {
            const imgWidth = this.imageElement.naturalWidth;
            const imgHeight = this.imageElement.naturalHeight;
            const imgAspectRatio = imgWidth / imgHeight;

            const maxAreaWidth = window.innerWidth * scaleRatio;
            const maxAreaHeight = window.innerHeight * scaleRatio;
            const maxAreaAspectRatio = maxAreaWidth / maxAreaHeight;

            let finalWidth, finalHeight;

            if (imgAspectRatio > maxAreaAspectRatio) {
                finalWidth = maxAreaWidth;
                finalHeight = finalWidth / imgAspectRatio;
            } else {
                finalHeight = maxAreaHeight;
                finalWidth = finalHeight * imgAspectRatio;
            }

            this.imageElement.style.width = `${finalWidth}px`;
            this.imageElement.style.height = `${finalHeight}px`;
            this.imageElement.style.top = '50%';
            this.imageElement.style.left = '50%';
            this.imageElement.style.transform = 'translate(-50%, -50%)';
        }

        setupMouseControl() {
            let isDragging = false;
            let startX, startY;
            let rotateX = 0, rotateY = 0;
            
            this.imageElement.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                e.stopPropagation();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                rotateY += deltaX * 0.5;
                rotateX -= deltaY * 0.3;
                
                rotateX = Math.max(-60, Math.min(60, rotateX));
                
                this.imageElement.style.transform = 
                    `translate(-50%, -50%) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
                
                startX = e.clientX;
                startY = e.clientY;
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    $gameTemp.closeCSS3DViewer();
                }
            });
        }
        
        close() {
            this.container.style.opacity = '0';
            if (this.imageElement) this.imageElement.style.opacity = '0';
            
            setTimeout(() => {
                const container = document.getElementById('css3d-viewer-container');
                if (container) {
                    document.body.removeChild(container);
                }
            }, 300);
        }
    }
})();
