/*:
 * @plugindesc 3D图片查看器插件
 * @author Aaron Gao & Donovan Yuan
 *
 * @param ScaleRatio
 * @text 图片缩放比例
 * @desc 图片占据屏幕的最大宽高比例，例如 0.8 代表占据屏幕 80% 的大小。
 * @default 0.8
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 1.0
 * * @param BackgroundOpacity
 * @text 背景遮罩透明度
 * @desc 背景黑色遮罩的透明度，0.0 为全透明，1.0 为纯黑。
 * @default 0.7
 * @type number
 * @decimals 1
 * @min 0.0
 * @max 1.0
 *
 * @help 用法：
 * 1. 将图片放入项目的 img/pictures/ 文件夹中
 *
 * 2. 在事件中使用插件命令：
 *  打开查看器：Open3DViewer 图片文件名
 * （例如：Open3DViewer Card01  或者  Open3DViewer Card01.png）
 *
 * 注意：
 *  当3D查看器打开时，事件将会停止推进，直到查看器关闭。
 *  插件会自动尝试寻找 .png, .jpg, .jpeg, .gif, .webp 格式的图片，
 *  你不再需要强制写明后缀名。
 */

(function() {
    // 获取插件参数 (请确保你的插件文件名为 CSS3DViewer.js)
    const parameters = PluginManager.parameters('CSS3DViewer');
    const scaleRatio = Number(parameters['ScaleRatio'] || 0.8);
    const bgOpacity = Number(parameters['BackgroundOpacity'] || 0.7);

    let currentViewer = null;

    // --- Game_Temp ---
    // 增加一个状态标识
    Game_Temp.prototype._css3dViewerOpen = false;

    Game_Temp.prototype.isCSS3DViewerOpen = function() {
        return this._css3dViewerOpen;
    };

    Game_Temp.prototype.openCSS3DViewer = function(imagePath) {
        if (currentViewer) currentViewer.close();
        currentViewer = new CSS3DViewer(imagePath);
        this._css3dViewerOpen = true; // 设置打开标志
    };

    Game_Temp.prototype.closeCSS3DViewer = function() {
        if (currentViewer) {
            currentViewer.close();
            currentViewer = null;
        }
        this._css3dViewerOpen = false; // 清除打开标志
    };


    // --- Game_Interpreter ---
    // 拦截插件命令
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'Open3DViewer') {
            $gameTemp.openCSS3DViewer(args[0]);
            this.setWaitMode('css3dViewer'); // 设置等待模式，让解释器暂停
        } 
    };

    // 修改 updateWait 拦截等待模式
    const _Game_Interpreter_updateWait = Game_Interpreter.prototype.updateWait;
    Game_Interpreter.prototype.updateWait = function() {
        if (this._waitMode === 'css3dViewer') {
            if ($gameTemp.isCSS3DViewerOpen()) {
                return true; // 如果查看器开着，则返回 true，表示继续等待
            } else {
                this._waitMode = ''; // 查看器关闭，清除等待模式
                return false; // 返回 false，恢复执行
            }
        }
        return _Game_Interpreter_updateWait.call(this);
    };


    // --- 3D查看器核心类 ---
    class CSS3DViewer {
        constructor(imagePath) {
            this.imagePathBase = imagePath;
            // 常见的图片后缀，用于自动检测
            this.extensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
            this.currentExtIndex = 0;

            // --- 容器 ---
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
            
            // --- 图片 ---
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
            
            // --- 关闭按钮 ---
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

            // 图片加载成功后的处理
            this.imageElement.onload = () => {
                this.resizeImage();
                setTimeout(() => {
                    this.container.style.opacity = '1';
                    this.imageElement.style.opacity = '1';
                }, 10);
            };

            // 图片加载失败时的处理（自动尝试下一个后缀）
            this.imageElement.onerror = () => {
                // 如果用户本身就带了后缀名，则直接报错并关闭
                if (this.imagePathBase.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                    console.error(`无法加载图片: ${this.imagePathBase} (请检查 img/pictures 文件夹)`);
                    $gameTemp.closeCSS3DViewer();
                } else {
                    // 如果用户没带后缀，尝试下一个后缀名
                    this.currentExtIndex++;
                    this.tryLoadImage();
                }
            };
            
            this.setupMouseControl();

            // 开始加载图片
            this.tryLoadImage();
        }

        // 尝试加载图片的逻辑
        tryLoadImage() {
            if (this.imagePathBase.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                // 如果参数本身包含了后缀名，直接加载
                this.imageElement.src = 'img/pictures/' + this.imagePathBase;
            } else {
                // 遍历尝试后缀名
                if (this.currentExtIndex < this.extensions.length) {
                    const ext = this.extensions[this.currentExtIndex];
                    this.imageElement.src = 'img/pictures/' + this.imagePathBase + ext;
                } else {
                    // 所有后缀都尝试完了还是失败
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

            // 这里使用了插件参数 scaleRatio 代替原本写死的 0.8
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
