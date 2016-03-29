function ImageEditor(imgopts){
    this.defaultopts = {
        url:'',                         //原图url
        degree:-90,                     //默认旋转角度
        lineWeight:[5,10,15],           //马赛克画笔
        crossDomain:false,              //所编辑的图片是否是远程跨域图片
        newSize:null,                   //number,编辑完成后按比率缩放到该尺寸
        editComplete:function(file) {   //编辑完成回调
            var newData = {
                "Pic-Size":"0*0",
                "Pic-Encoding":"base64",
                "Pic-Path":"/p1/big/",
                "Pic-Data":file.substring(23)
            };
            $.ajax({
                url: "http://upload.58cdn.com.cn/json",
                type:'POST',
                data:JSON.stringify(newData),
                processData: false,  // 告诉jQuery不要去处理发送的数据
                success:function(url){             
                    var url = "http://pic.58.com/p1/big/" + url;
                    alert(url)
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    _this.errorHandler(XMLHttpRequest.status+'&'+textStatus+'&'+errorThrown);
                }
            });
        }
    };
    this.opts = $.extend(true, {}, this.defaultopts, imgopts);

    this.canvas = '';
    this.context = '';
    this.editFrame = '';    //整个编辑组件
    this.canvasFrame = '';  //画布所在框
    this.clipFrame ='';     //裁剪框

    this.emptyEditHistory();//清空编辑历史数据
    
    this.init();
};
ImageEditor.prototype = {
    init:function(){
        var _this = this;
        var bindEditFrame = 'EVENT_OF_BIND_DOM_EVENT';
        
        //防止剪切框拖动过程出现选中状态
        $('body').bind(bindEditFrame, function(){
            _this.bindDomEvent();
        });
        //图片绘制完成才初始化操作绑定
        _this.createDom(bindEditFrame);

        _this.initDone();
    },
    emptyEditHistory:function(){
        this.editHistory = [];
        this.currentEditObj = {
            editType:'',
            initImg:''
        };
        
        this.mosaicAble = false;    //马赛克未初始化
        this.clipAble = false;

        this.initSuccess = false;   //初始化未完成

        this.initSize = false;      //原图第一次缩放比,提交前还原尺寸
        
        this.clipOpenTime = null;
        this.clipCompleteTime = null;
    },
    initDone:function(){
        var _this = this;
        $('body').bind('selectstart', function(){
            return false;
        });
        _this.changeWindowScroll('forbid');
        _this.listenOptionsShow('start');
        setTimeout(function(){
            if( !_this.initSuccess && ( $('#editFrame').css('display') != 'none') ){
                alert('图片初始化失败，请重试');
                _this.hideEditFrame();
            }
        },20*1000);
    },
    /**
     * 从第二张图片打开时恢复编辑组件数据到默认状态，重绘新图片，不再init
     */
    resetImgItem:function(imgopts){

        var _this = this;
        
        _this.opts = $.extend(true, {}, _this.defaultopts, imgopts);

        $('#shadeFrame').show();
        $(_this.editFrame).show();
        $(_this.loadingTip).show();     

        //重绘图片
        _this.emptyEditHistory();

        _this.initResizeCanvas();   

        //按钮样式
        $(_this.btn.restoreBtn).addClass('restoreDisable');
        $(_this.btn.clipBtn).attr('class','button1 clipDefault');
        $(_this.btn.rotateBtn).attr('class','button1 rotateDefault');
        $(_this.btn.mosaicBtn).attr('class','button1 mosaicDefault');

        _this.initDone();
    },
    /**
     * 生成Dom结构并初始化事件绑定,只在编辑第一张图片时执行
     * @param {[String]} EVENT_TYPE [回调中触发的事件,此处固定为EVENT_OF_BIND_EDIT_FRAME]
     */
    createDom:function(EVENT_TYPE){
        var _this = this;

        // 遮罩加编辑框加画布
        var domStr = '<div id="shadeFrame">'+
                     '</div>'+
                     '<div id="editFrame">'+
                        '<div class="editTitle">'+
                            '<span>编辑图片</span>'+
                            '<div id="btnClose"></div>'+
                        '</div>'+
                        '<div id="canvasFrame">'+
                            '<canvas id="canvas">你的浏览器不支持编辑功能</canvas>'+
                            '<span id="loadingTip">图片加载中……</span>'+
                        '</div>'+
                        '<div class="buttonBar">'+
                            '<div class="lineWeightOptions">'+
                                '<div class="listIcon">'+
                                    '<div class=""></div>'+
                                '</div>'+
                                '<div class="options">'+
                                    '<div class="sLine"><span></span> 小范围</div>'+
                                    '<div class="mLine"><span></span> 中范围</div>'+
                                    '<div class="bLine"><span></span> 大范围</div>'+
                                '</div>'+
                            '</div>'+
                            '<div class="editBtnBar">'+
                                '<div class="button1 rotateDefault" id="rotate"><div class="editBtnIcon"></div><span>旋转</span></div>'+
                                '<div class="button1 clipDefault" id="clip"><div class="editBtnIcon"></div><span>剪裁</span></div>'+
                                '<div class="button1 mosaicDefault" id="mosaic"><div class="editBtnIcon"></div><span>模糊</span></div>'+
                            '</div>'+
                            '<div id="restore" class="restoreDisable"><div class="restoreIcon"></div><span>撤销</span></div>'+
                        '</div>'+
                        '<div id="submitImage">完成</div>'+
                     '</div>';
        $('body').append(domStr);

        _this.canvas = document.getElementById('canvas');
        _this.canvasFrame =document.getElementById('canvasFrame');
        _this.editFrame = document.getElementById('editFrame');
        _this.loadingTip = document.getElementById('loadingTip');

        try{
            _this.context = _this.canvas.getContext('2d');
        }catch(e){
            alert('你的浏览器不支持图片编辑功能，请升级浏览器或使用其他浏览器重试');
            _this.hideEditFrame();
            return;
        }

        _this.btn ={
            clipBtn:document.getElementById('clip'),
            rotateBtn:document.getElementById('rotate'),
            mosaicBtn:document.getElementById('mosaic'),
            restoreBtn:document.getElementById('restore'),
            submitBtn:document.getElementById('submitImage'),
            closeBtn:document.getElementById('btnClose')
        };
        // 生成适应编辑框的画布图
        _this.initResizeCanvas(EVENT_TYPE);
    },
    /**
     * 针对编辑框按钮样式和功能的绑定
     */
    bindDomEvent:function(){
        var _this = this;

        //按钮样式及功能切换绑定
        $(_this.btn.clipBtn).on('mouseover',_mouseOverBtn).on('mouseout',_mouseOutBtn).on('click',_clickBtn);
        $(_this.btn.rotateBtn).on('mouseover',_mouseOverBtn).on('mouseout',_mouseOutBtn).on('click',_clickBtn);
        $(_this.btn.mosaicBtn).on('mouseover',_mouseOverBtn).on('mouseout',_mouseOutBtn).on('click',_clickBtn);

        function _mouseOverBtn(e){
            if(!_this.initSuccess){
                return;
            }
            var targetId = $(this).attr('id');
            if($(this).hasClass(targetId+'Click')){
                return;
            }else{
                $(this).addClass(targetId+'Hover')
            }
        }
        function _mouseOutBtn(e){
            if(!_this.initSuccess){
                return;
            }
            var targetId = $(this).attr('id');
            $(this).removeClass(targetId+'Hover');
        }
        function _clickBtn(e){
            if(!_this.initSuccess){
                return;
            }
            var targetId = $(this).attr('id');
            _this.setEditBtnStyle(e);

            if(targetId != 'mosaic'){
                //cursor设为默认
                _this.setCursorAndBtn();
                
                //解绑马赛克
                _this.mosaicAble = false;
                $(_this.canvas).off('mousedown.mosaic');
                
                $('.listIcon').hide();
                $('.options').hide();
            }   

            var editType = _this.currentEditObj.editType;

            if(_this.clipAble){
                if(targetId == 'clip')return;
                if(editType != 'clip'){
                    _this.justChangeEditObj('clip');
                }
                _this.applyClipOrNot(targetId);

            }else{
                //如果是没有选中编辑状态或者处于rotate，设置状态并执行一次
                if( editType == ''){
                    //初始状态，直接切换
                    _this.changeEditType(targetId);
                    return;
                }else if(editType=='rotate'){
                    if(targetId == 'rotate'){
                        _this.rotate();
                    }else{
                        _this.changeEditType(targetId);
                    }
                }else if(editType == 'mosaic'){
                    if(targetId == 'mosaic'){
                        if(_this.mosaicAble)return;
                        _this.mosaic();
                    }else{
                        _this.changeEditType(targetId);
                    }
                }else{
                    //clipAble == true已在上面处理，此处若editType==clip都是未初始化clip的状态
                    //或者clipAble == submitImage
                    _this.changeEditType(targetId);
                }
            }
        }

        //画笔框下拉三角
        $('.listIcon').on('click',function(){
            $('.options').show();
        });

        //画笔粗细下拉选项绑定
        var lineTypeArr = ['s','m','b'];
        $('.options').on('click','div',function(e){
            var lineWeightClass = $(e.currentTarget).attr('class');
            var lineType = lineWeightClass[0];//mLine[0]
            
            var index = lineTypeArr.indexOf(lineType);
            
            var flag = (lineType=='b')?('l'):(lineType);
            _this.lineWeight = _this.opts.lineWeight[index];
            
            _this.setCursorAndBtn(lineType);
        });

        //撤销按钮功能及其样式
        $(_this.btn.restoreBtn).on('mouseover',function(){
            if($(this).hasClass('restoreDisable')){
                return;
            }else{
                $(this).attr('class','restoreHover');
            }
        }).on('mouseout',function(){
            $(this).removeClass('restoreHover');
        }).on('click',function(){
            if( $(this).hasClass('restoreDisable') ){
                return;
            }
            var currentEditObj =  _this.currentEditObj;
            var restoreEditType = currentEditObj.editType;
            //第一次切换到撤销先判断当前obj是否有可撤销数据
            if(restoreEditType == 'submitImage' || (restoreEditType == 'clip' && typeof currentEditObj.isAppClip == 'undefined') || (restoreEditType == 'rotate' && typeof currentEditObj.step == 'undefined') || (restoreEditType == 'mosaic' && typeof currentEditObj.track == 'undefined')){
                _this.changeEditObjWhenRestore();
                var restoreEditType = _this.currentEditObj.editType;
            }
            switch(restoreEditType){
                case 'rotate':
                    _this.restoreRotate();
                    break;
                case 'clip':
                    _this.restoreClip();
                    break;
                case 'mosaic':
                    _this.restoreMosaic();
                    break;
                default:
                    return;
            }
        });

        //完成按钮
        $(_this.btn.submitBtn).on('click',function(){
            if(!_this.initSuccess){
                return;
            }
            var editType = _this.currentEditObj.editType;
            if(_this.clipAble){
                if(editType != 'clip'){
                    _this.justChangeEditObj('clip');
                }
                _this.applyClipOrNot('submitImage');
            }else{
                if(editType == 'submitImage'){
                    _this.submitImage();
                }else{
                    _this.changeEditType('submitImage');
                }
            }
        });

        $('#btnClose').on('click',function(){
            _this.hideEditFrame();
        });
    },
    /**
     * 禁止滚动，防止mosaic错位，关闭后恢复
     * @param  {String} allowOrForbid [当前按钮点击事件对象]
     */
    changeWindowScroll:function(allowOrForbid){
        if(allowOrForbid == 'forbid'){
            $('body').on('mousewheel.editPic',function(ev){
                return false;
            }).on('DOMMouseScroll.editPic',function(ev){
                //fireFox
                return false;
            });
            var top = (document.documentElement.scrollTop||document.body.scrollTop);
            $(window).on('scroll.editPic',function(ev){
                $(window).scrollTop(top);
            });
        }else if(allowOrForbid == 'allow'){
            $('body').off('mousewheel.editPic').off('DOMMouseScroll.editPic');
            $(window).off('scroll.editPic');
        }else{
            return;
        }
    },
    listenOptionsShow:function(startOrOver){
        if(startOrOver == 'start'){
            $('body').on('click.listenOptions',function(e){

                if( $('.options').css('display') == 'none' ){
                    return;
                }

                var target = e.target;
                //点击listIcon
                var flag1 = $(target).hasClass('listIcon');
                var flag2 = $(target).parent().hasClass('listIcon');

                if(!(flag1 || flag2)){
                    $('.options').hide();
                }
            });
        }else if(startOrOver == 'over'){
            $('body').off('click.listenOptions');
        }
    },
    /**
     * 设置编辑按钮样式
     * @param  {Object} e [当前按钮点击事件对象]
     */
    setEditBtnStyle:function(e){
        var btnId = $(e.currentTarget).attr('id');

        siblings = $(e.currentTarget).siblings();
        for(var i = 0,len = siblings.length;i < len; i++){
            $(siblings[i]).removeClass($(siblings[i]).attr('id')+'Click');

        }
        if(btnId != 'mosaic'){
            $('#mosaic').attr('class','button1 mosaicDefault');
        }

        $(e.currentTarget).removeClass(btnId+'Hover');
        if(btnId != 'rotate'){
            $(e.currentTarget).addClass(btnId+'Click');
        }
    },
    loadImg:function(src,callback,crossOrigin){
        var img = new Image();
        if(crossOrigin){//原始图片需跨域
            img.crossOrigin = 'anonymous';
        }
        img.onload = callback;
        img.src = src;
    },
    /**
     * 初始时调节图片适应编辑框，记录原始缩放比
     */
    initResizeCanvas:function(EVENT_TYPE){
        var _this = this;
        var _callback = function(){

            //隐藏tip
            $(_this.loadingTip).hide();

            //初始化时保存缩放比例用于上传前还原尺寸，小图不放大
            _this.resizeRate = _this.resetCanvas(this.naturalWidth,this.naturalHeight,false);
            _this.initSize = (this.naturalWidth >= this.naturalHeight)?this.naturalWidth:this.naturalHeight;

            var canvas = _this.canvas;

            //绘制初始化图片到画布
            _this.context.drawImage(this,0,0,this.width,this.height,0,0,canvas.width,canvas.height);

            //绘制完成初始化当前图片数据
            try{
                // _this.currentApplictImg = 
                _this.currentEditObj.initImg = canvas.toDataURL('image/jpeg');
                //保存初始化图片数据到编辑历史中,状态切换中做了
                // _this.editHistory.push({editType:'',initImg:_this.currentApplictImg});
                //初始绘制完成绑定操作
                EVENT_TYPE && $('body').trigger(EVENT_TYPE);
                _this.initSuccess = true;
                $(_this.canvas).show();
            }catch(e){
                _this.hideEditFrame();
                alert('你的浏览器暂不支持图片编辑功能，请升级或使用其他浏览器');
            }

        };

        // if(typeof _this.opts.item.imgData4Edit != 'undefined'){
        //     _this.loadImg(_this.opts.item.imgData4Edit,_callback);
        // }else{
        //     _this.loadImg(_this.opts.url,_callback,true);//跨域图片
        // }

        _this.loadImg(_this.opts.url,_callback,_this.opts.crossDomain);//跨域图片
    },
    /**
     * 根据图片尺寸和编辑框尺寸重设画布大小，返回缩放比率
     * @param {Number} imgW 新绘制图片宽度
     * @param {Number} imgH 新绘制图片高度
     * @param {Boolean}  true 为小图放大，适用于剪切旋转功能
     * @return {Number}
     */
    resetCanvas:function(imgW,imgH,flag){
        var _this = this;
        var w = imgW;
        var h = imgH;
        var resizeRate;

        var canvas = _this.canvas;
        var canvasFrame = _this.canvasFrame;

        //计算长宽比，以比例较大一边为基准缩放图片以适应画布框
        var wRate = w/$(canvasFrame).width();
        var hRate = h/$(canvasFrame).height();
        var _set = function(){
            if(wRate >= hRate){
                resizeRate = wRate;
                canvas.width =  $(canvasFrame).width();
                canvas.height = Math.round( h/resizeRate);
            }else{
                resizeRate = hRate;
                canvas.width =  Math.round( w/resizeRate);
                canvas.height = $(canvasFrame).height();
            }
        };

        //大图统一缩小
        if(  (wRate > 1 ) || (hRate > 1) ){
            _set();
        }else{
            if(flag && flag == true){
                //小图放大
                _set();
            }else{
                //小图不放大
                canvas.width =  w;
                canvas.height =  h;
                resizeRate = 1;
            }
        }
        //调节新画布位置使之居中
        _this.resetCanvasPos();
        return resizeRate;
    },
    /**
     * 调节画布居中
     */
    resetCanvasPos:function(){
        var canvas = this.canvas;
        var canvasFrame = this.canvasFrame;
        var widthDis = $(canvasFrame).width() - canvas.width;
        var heightDis = $(canvasFrame).height() - canvas.height;

        $(canvas).css({'left':parseInt(widthDis/2)+'px','top':parseInt(heightDis/2)+'px'});
    },
    /**
     * 调节图片到指定尺寸大小并上传
     */
    submitImage:function(){
        var _this = this,
            canvas =  _this.canvas,
            currentSize = canvas.width >= canvas.height ? canvas.width : canvas.height,
            newSize = _this.opts.newSize,
            initSize = _this.initSize,
            newImgData = canvas.toDataURL('image/jpeg');

        console.log(newImgData)
        //设定图片尺寸再回调
        if( typeof newSize === 'number' ){
            if( newSize != currentSize ){
                var _sizeObj = _this.getSizeObj(canvas.width, canvas.height, newSize);
                _this.resetImgAfterEdit(newImgData, _sizeObj.width, _sizeObj.height);
            }else{
                _this.opts.editComplete(newImgData);
            }
        }else if( initSize != currentSize ){
            var _sizeObj = _this.getSizeObj(canvas.width, canvas.height, initSize);
            _this.resetImgAfterEdit(newImgData, _sizeObj.width, _sizeObj.height);
        }else{
            //直接回调
            _this.opts.editComplete(newImgData);
        }
    },
    /**
     * 根据stdSize和原始宽高计算新图片size
     * @param {Number} width [原始宽度]
     * @param {Number} height [原始高度]
     * @param {Number} stdSize [标准参考尺寸]
     * @return {Object}  [新长宽数据]
     */
    getSizeObj:function(width, height, stdSize){
        var w,h;
        if(width >= height){
            w = stdSize;
            h = height*stdSize/width;
        }else{
            h = stdSize;
            w = width*stdSize/height;
        }
        return {width:w, height:h};
    },
    /**
     * 把图片调节到指定尺寸并执行回调
     */
    resetImgAfterEdit:function(imgData, newWidth, newHeight){
        var _this = this, cvs = document.createElement('canvas'), cxt = cvs.getContext('2d');
        cvs.width =  newWidth;
        cvs.height =  newHeight;
        
        var _callback = function(){
            cxt.drawImage(this,0,0,this.width,this.height,0,0,cvs.width,cvs.height);
            newImgData = cvs.toDataURL('image/jpeg');
            //必须回调上传
            _this.opts.editComplete(newImgData);
        };
        _this.loadImg(imgData,_callback);
    },
    /**
     * 上传成功后根据新url替换缩略图和imglist中url
     * @param {String} url [上传成功后返回的url]
     */
    successHandler:function(url){
        var _this = this;

        var reg = /.\w+$/;
        var res = reg.exec(url);
        var index = url.indexOf(res);
        url = url.substring(0,index)+'_130_100'+url.substring(index);

        _this.opts.item.setValue(url);

        //销毁dom
        _this.hideEditFrame();
    },
    errorHandler:function(errorMsg){
        var item = this.opts.item;
        //新错误统计埋点
        item.setLog('errorMsg',errorMsg);
        item.sendLog();
        
        alert('上传失败，请重试');
    },
    /**
     * 旋转函数从currentApplictImg中获取基准图，通过计算当前旋转角度currentDegree直接执行一步到位的循转
     * 这样可以避免restore时执行多步当次循转耗费性能
     */
    rotate:function(){
        var _this = this;
        var currentEditObj = _this.currentEditObj;

        //旋转记步，决定restore次数
        if(typeof currentEditObj.step == 'undefined'){
            currentEditObj.step = 0; 
        }
        currentEditObj.step += 1; 

        var _callback = function(){
            var currentDegree = (currentEditObj.step * _this.opts.degree)%360;
            _this.doRotation(this,currentDegree);
            //完成操作启用restore按钮
            $(_this.btn.restoreBtn).removeClass('restoreDisable');
        };
        var src = currentEditObj.initImg;
        _this.loadImg(src,_callback);
    },
    /**
     * 执行旋转操作
     * @param {[Image]} img [旋转基准图片]
     * @param {[Number]} degree [具体旋转度数]
     */
    doRotation:function(img,degree){
        var _this = this;
        var rads=degree*Math.PI/180;
        var newWidth, newHeight;

        //兼容单步旋转不是90度情况
        var c = Math.cos(rads);
        var s = Math.sin(rads);
        if (s < 0) { s = -s; }
        if (c < 0) { c = -c; }
        newWidth = img.naturalHeight * s + img.naturalWidth * c;
        newHeight = img.naturalHeight * c + img.naturalWidth * s;

        //单步旋转90度可直接长宽互换
        // newWidth = img.naturalHeight;
        // newHeight = img.naturalWidth;

        //根据新的长宽设置适应编辑框大小的canvas尺寸，执行小图放大
        var resetRate = _this.resetCanvas(parseInt(newWidth),parseInt(newHeight),false);

        var canvas = _this.canvas;
        var cx=canvas.width/2;
        var cy=canvas.height/2;

        var context = _this.context;
        context.save();
        context.clearRect(0, 0, canvas.width, canvas.height);
        //移动使旋转基准点变为画布中央
        context.translate(cx, cy);
        context.rotate(rads);

            //canvas基准点被移动到了画布中央，且画布尺寸有缩放，
            //故绘制时应从中心点平移缩放后画布大小的一半到左上角基准点
            //img.naturalWidth在奇偶数倍循转时分别等同于 _this.canvas.height 和_this.canvas.width
        var fromX = -(img.naturalWidth/resetRate/2),
            fromY = -(img.naturalHeight/resetRate/2),
            //若是奇数倍循转，context与canvas垂直，新绘制宽高应canvas宽高互换
            //若是偶数倍循转，context与canvas平行，新绘制宽高就是canvas宽高
            sizeW = (degree/90%2 == 0)?canvas.width:canvas.height,
            sizeH = (degree/90%2 == 0)?canvas.height:canvas.width;

        context.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,fromX,fromY,sizeW,sizeH);

        //旋转后撤销context环境，确保接下来的画布操作不会错位
        context.restore();
    },
    /**
     * 撤销旋转到上一步
     */
    restoreRotate:function(){
        var _this = this;
        var currentEditObj = _this.currentEditObj;
        
        var restRestoreCount = currentEditObj.step;
        if(restRestoreCount <= 0){
            return;
        }

        restRestoreCount -= 1;
        currentEditObj.step -= 1;

        var _callback =function(){
            var currentDegree = restRestoreCount * _this.opts.degree;

            _this.doRotation(this,currentDegree);
            if(restRestoreCount == 0){
                //若是撤销旋转完成，删除当前的旋转历史数据
                _this.changeEditObjWhenRestore();
            }
            //如果clipFrame显示着，reset
            if( (_this.clipFrame!= '') && ($(_this.clipFrame).css('display')!= 'none') ){
                _this.resetClipFrameWhenRestore();
            }
        };
        _this.loadImg(currentEditObj.initImg,_callback);
    },
    /**
     * 剪切功能打开
     * @param {[Function]} method [处理函数]
     * @param {[Object]} context [执行method的环境对象（执行上下文）]
     */
    clip:function(){
        var _this = this;

        if(_this.clipAble)return;
        _this.clipAble = true;  
        //若是初次打开裁剪框
        if( _this.clipFrame == ''){
            //生成裁剪框
            var clipFrame = '<div id="clipFrame">'+
                                '<div class="toNW"></div>'+
                                '<div class="toN"></div>'+
                                '<div class="toNE"></div>'+
                                '<div class="toE"></div>'+
                                '<div class="toSE"></div>'+
                                '<div class="toS"></div>'+
                                '<div class="toSW"></div>'+
                                '<div class="toW"></div>'+
                            '</div>';
            $(_this.canvasFrame).append(clipFrame);

            _this.clipFrame = document.getElementById('clipFrame');

        }else{
            $('#clipFrame').show();
        }
        _this.clipOpenTime = (new Date()).getTime();

        //先初始化框再去绑定，绑定中要获取初始信息
        var pos = _this.initClipFramePos();

        _this.bindResetClipFrame();
    },
    /**
     * 每次切换功能时调整剪切框位置居中
     */
    initClipFramePos:function(){
        var _this = this;
        var canvas = $(_this.canvas);

        var clipLeft = parseInt(canvas.position().left),
            clipTop = parseInt(canvas.position().top),
            clipWidth = parseInt(canvas.width()-2),
            clipHeight = parseInt(canvas.height()-2);

        $(_this.clipFrame).css({'left':clipLeft+'px','top':clipTop+'px','width':clipWidth+'px','height':clipHeight+'px'});

        _this.resetKeyPoint();

        return [clipLeft,clipTop,clipWidth,clipHeight];
    },
    /**
     * 每次撤销循转时判断剪切框是否需调整
     */
    resetClipFrameWhenRestore:function(){
        var _this = this;
        var canvas = $(_this.canvas);
        var clipFrame = $(_this.clipFrame);

        var clipLeft = clipFrame.position().left,
            clipTop = clipFrame.position().top,
            clipWidth = clipFrame.width(),
            clipHeight = clipFrame.height();

        var canvasLeft = canvas.position().left,
            canvasTop = canvas.position().top,
            canvasWidth = canvas.width(),
            canvasHeight = canvas.height();

        //左边界
        (clipLeft < canvasLeft)&&( clipFrame.css({'left':canvasLeft+'px','width':clipWidth - (canvasLeft - clipLeft)+'px'}) );

        //右边界
        ((clipLeft + clipWidth) > (canvasLeft + canvasWidth -2))&&( clipFrame.css({'width':clipFrame.width() - ( (clipLeft + clipWidth) - (canvasLeft + canvasWidth -2) ) +'px'}) );
        
        //上边界
        (clipTop < canvasTop)&&( clipFrame.css({'top':canvasTop+'px','height':clipHeight - (canvasTop - clipTop)+'px'}) );
        
        //下边界
        ((clipTop + clipHeight) > (canvasTop + canvasHeight -2))&&( clipFrame.css({'height':clipFrame.height() - ((clipTop + clipHeight) - (canvasTop + canvasHeight -2)) +'px'}) );
        
        _this.resetKeyPoint();
    },
    isFullClipFrame:function(){
        var wClipFrame = $(this.clipFrame).width(),
            hClipFrame = $(this.clipFrame).height(),

            wCanvas = $(this.canvas).width(),
            hCanvas = $(this.canvas).height();

        return (wClipFrame+2 >= wCanvas && hClipFrame+2 >= hCanvas);
    },
    /**
     * 打开剪切框时保存mouseMove中用到的数据
     */
    setClipAndCanvasInfo:function(){
        var _this = this;
        var parentBox = $(_this.canvas);
        var clipFrame = $(_this.clipFrame);

        _this.clipAndCanvasInfo = {
            canvasLeft : parentBox.offset().left,
            canvasTop : parentBox.offset().top,
            canvasWidth : parentBox.width(),
            canvasHeight :parentBox.height(),
            clipLeft : clipFrame.offset().left,
            clipTop : clipFrame.offset().top,
            clipWidth : clipFrame.width(),
            clipHeight : clipFrame.height()
        };
    },
    /**
     * 绑定剪切框移动，resize等事件
     */
    bindResetClipFrame:function(){
        var isMouseDown = false;
        var isResize = false;
        var minDis = 2;//边框吸附距离px
        var minClipFrameSize = 25;//裁剪框最小尺寸

        var distanceX,
            distanceY,
            resizeStyle,
            clipAndCanvasInfo;

        var _this = this;
        var clipFrame = $(_this.clipFrame);

        //初始化resize 关键点位置
        _this.resetKeyPoint();

        /**
         *剪切框各方向缩放
         */
        var _resizeClipFrame = {
            toNW:function(e){
                var oldOffset = clipFrame.offset(),
                    //鼠标在横纵方向移动距离
                    mouseMoveDisX = _this.oldMousePos[0] - e.clientX,
                    mouseMoveDisY = _this.oldMousePos[1] - e.clientY,
                    //根据鼠标移动距离和上一个clipFrame信息计算得到新信息
                    left = oldOffset.left - mouseMoveDisX,
                    top = oldOffset.top - mouseMoveDisY,
                    width = clipFrame.width() + mouseMoveDisX,
                    height = clipFrame.height() + mouseMoveDisY;

                if(oldOffset.left - mouseMoveDisX - minDis < _this.clipAndCanvasInfo.canvasLeft){
                    left = _this.clipAndCanvasInfo.canvasLeft;
                    width = clipFrame.width() + (oldOffset.left - _this.clipAndCanvasInfo.canvasLeft);
                }
                if(oldOffset.top - mouseMoveDisY - minDis < _this.clipAndCanvasInfo.canvasTop){
                    top = _this.clipAndCanvasInfo.canvasTop;
                    height = clipFrame.height() + (oldOffset.top - _this.clipAndCanvasInfo.canvasTop);
                }
                
                //未到左边界或者到了左边界往右拉伸
                if((oldOffset.left != _this.clipAndCanvasInfo.canvasLeft || (e.clientX - _this.oldMousePos[0] )>0) && (width > minClipFrameSize)){
                    clipFrame.width(width);
                    clipFrame.offset({'left':left});
                }
                //未到上边界或者到了上边界往下拉伸
                if((oldOffset.top != _this.clipAndCanvasInfo.canvasTop || (e.clientY -_this.oldMousePos[1]) >0) && (height > minClipFrameSize)){
                    clipFrame.height(height);
                    clipFrame.offset({'top':top});
                }

                _this.oldMousePos = [e.clientX,e.clientY];

            },
            toN: function(e){
                var oldOffset = clipFrame.offset(),
                    mouseMoveDisY = _this.oldMousePos[1] - e.clientY,
                    top = oldOffset.top - mouseMoveDisY,
                    height = clipFrame.height() + mouseMoveDisY;
                
                if(clipFrame.offset().top - mouseMoveDisY - minDis < _this.clipAndCanvasInfo.canvasTop){
                    top = _this.clipAndCanvasInfo.canvasTop;
                    height = clipFrame.height() + (oldOffset.top - _this.clipAndCanvasInfo.canvasTop);
                }

                if((oldOffset.top != _this.clipAndCanvasInfo.canvasTop || (e.clientY -_this.oldMousePos[1]) >0) &&(height > minClipFrameSize) ){
                    clipFrame.height(height);
                    clipFrame.offset({'top':top});
                }        
                _this.oldMousePos = [e.clientX,e.clientY];
            },
            toNE: function(e){
                var oldOffset = clipFrame.offset(),
                    //鼠标在横纵方向移动距离
                    mouseMoveDisX = _this.oldMousePos[0] - e.clientX,
                    mouseMoveDisY = _this.oldMousePos[1] - e.clientY,
                    //根据鼠标移动距离和上一个clipFrame信息计算得到新信息
                    top = oldOffset.top - mouseMoveDisY,
                    width = clipFrame.width() - mouseMoveDisX,
                    height = clipFrame.height() + mouseMoveDisY;

                if(oldOffset.left +clipFrame.width() - mouseMoveDisX + minDis > ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth)){
                    width = ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth) - oldOffset.left -2;
                }
                if(oldOffset.top - mouseMoveDisY - minDis < _this.clipAndCanvasInfo.canvasTop){
                    top = _this.clipAndCanvasInfo.canvasTop;
                    height = clipFrame.height() + (oldOffset.top - _this.clipAndCanvasInfo.canvasTop);
                }
                
                //未到右边界或者到了右边界往左拉伸
                if(((oldOffset.left + clipFrame.width())!= ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth - 2) || (e.clientX - _this.oldMousePos[0] )<0) &&(width > minClipFrameSize) ){
                    clipFrame.width(width);
                }
                //未到上边界或者到了上边界往下拉伸
                if((oldOffset.top != _this.clipAndCanvasInfo.canvasTop || (e.clientY -_this.oldMousePos[1]) >0)&&(height>minClipFrameSize)){
                    clipFrame.height(height);
                    clipFrame.offset({'top':top});
                }

                _this.oldMousePos = [e.clientX,e.clientY];

            },
            toE: function(e){
                var oldOffset = clipFrame.offset(),
                    //鼠标在横纵方向移动距离
                    mouseMoveDisX = _this.oldMousePos[0] - e.clientX,
                    width = clipFrame.width() - mouseMoveDisX;

                if(oldOffset.left +clipFrame.width() - mouseMoveDisX + minDis > ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth)){
                    width = ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth) - oldOffset.left -2;
                }
                
                //未到右边界或者到了右边界往左拉伸
                if(((oldOffset.left + clipFrame.width())!= ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth - 2) || (e.clientX - _this.oldMousePos[0] )<0) &&(width > minClipFrameSize) ){
                    clipFrame.width(width);
                }

                _this.oldMousePos = [e.clientX,e.clientY];
            },
            toSE: function(e){
                var oldOffset = clipFrame.offset(),
                    //鼠标在横纵方向移动距离
                    mouseMoveDisX = _this.oldMousePos[0] - e.clientX,
                    mouseMoveDisY = _this.oldMousePos[1] - e.clientY,
                    //根据鼠标移动距离和上一个clipFrame信息计算得到新信息
                    width = clipFrame.width() - mouseMoveDisX,
                    height = clipFrame.height() - mouseMoveDisY;

                if(oldOffset.left +clipFrame.width() -mouseMoveDisX + minDis > ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth)){
                    width = ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth) - oldOffset.left -2;
                }
                if(oldOffset.top + clipFrame.height() - mouseMoveDisY+minDis > ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight)){
                    height = ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight) - oldOffset.top - 2;
                }
                
                //未到右边界或者到了右边界往左拉伸
                if(((oldOffset.left + clipFrame.width())!= ( _this.clipAndCanvasInfo.canvasLeft+ _this.clipAndCanvasInfo.canvasWidth - 2) || (e.clientX - _this.oldMousePos[0] )<0) &&(width > minClipFrameSize) ){
                    clipFrame.width(width);
                }
                if(((oldOffset.top + clipFrame.height())!= ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight - 2) || (e.clientY - _this.oldMousePos[1] )<0) &&(height > minClipFrameSize) ){
                    clipFrame.height(height);
                }
                _this.oldMousePos = [e.clientX,e.clientY];
            },
            toS: function(e){
                var oldOffset = clipFrame.offset(),
                    //鼠标在横纵方向移动距离
                    mouseMoveDisY = _this.oldMousePos[1] - e.clientY,
                    //根据鼠标移动距离和上一个clipFrame信息计算得到新信息
                    height = clipFrame.height() - mouseMoveDisY;

                if(oldOffset.top + clipFrame.height() - mouseMoveDisY+minDis > ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight)){
                    height = ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight) - oldOffset.top - 2;
                }
                
                if(((oldOffset.top + clipFrame.height())!= ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight - 2) || (e.clientY - _this.oldMousePos[1] )<0) &&(height > minClipFrameSize) ){
                    clipFrame.height(height);
                }
                _this.oldMousePos = [e.clientX,e.clientY];
            },
            toSW: function(e){
                var oldOffset = clipFrame.offset(),
                    //鼠标在横纵方向移动距离
                    mouseMoveDisX = _this.oldMousePos[0] - e.clientX,
                    mouseMoveDisY = _this.oldMousePos[1] - e.clientY,
                    //根据鼠标移动距离和上一个clipFrame信息计算得到新信息
                    left = oldOffset.left - mouseMoveDisX,
                    width = clipFrame.width() + mouseMoveDisX;
                    height = clipFrame.height() - mouseMoveDisY;

                if(oldOffset.left - mouseMoveDisX - minDis < _this.clipAndCanvasInfo.canvasLeft){
                    left = _this.clipAndCanvasInfo.canvasLeft;
                    width = clipFrame.width() + (oldOffset.left -  _this.clipAndCanvasInfo.canvasLeft);
                }
                if(oldOffset.top + clipFrame.height() - mouseMoveDisY+minDis > ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight)){
                    height = ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight) - oldOffset.top - 2;
                }
                //到达左边界
                if( (oldOffset.left != _this.clipAndCanvasInfo.canvasLeft || (e.clientX - _this.oldMousePos[0] )>0)&&(width > minClipFrameSize) ){
                    clipFrame.width(width);
                    clipFrame.offset({'left':left});
                }
                if(((oldOffset.top + clipFrame.height())!= ( _this.clipAndCanvasInfo.canvasTop+ _this.clipAndCanvasInfo.canvasHeight - 2) || (e.clientY - _this.oldMousePos[1] )<0) &&(height > minClipFrameSize) ){
                    clipFrame.height(height);
                }
                _this.oldMousePos = [e.clientX,e.clientY];              
            },
            toW: function(e){
                var oldOffset = clipFrame.offset(),
                    mouseMoveDisX = _this.oldMousePos[0] - e.clientX,
                    left = oldOffset.left - mouseMoveDisX,
                    width = clipFrame.width() + mouseMoveDisX;

                if(oldOffset.left - mouseMoveDisX - minDis < _this.clipAndCanvasInfo.canvasLeft){
                    left = _this.clipAndCanvasInfo.canvasLeft;
                    width = clipFrame.width() + (oldOffset.left -  _this.clipAndCanvasInfo.canvasLeft);
                }

                //到达左边界
                if( (oldOffset.left != _this.clipAndCanvasInfo.canvasLeft || (e.clientX - _this.oldMousePos[0] )>0)&&(width > minClipFrameSize) ){
                    clipFrame.width(width);
                    clipFrame.offset({'left':left});
                }               

                _this.oldMousePos = [e.clientX,e.clientY];
            }
        };

        clipFrame.off('mousedown.clip');
        //为裁剪框绑定move和resize过程
        clipFrame.on('mousedown.clip',function(e){
            distanceX = e.clientX - $(this).offset().left;
            distanceY = e.clientY - $(this).offset().top;
            _this.oldMousePos =  [e.clientX,e.clientY];
            isMouseDown = true;

            //每次重获最新数据并保存，避免move时重复计算
            _this.setClipAndCanvasInfo();

            if($(e.target).attr('id') != 'clipFrame'){
                //点击resize关键点
                isResize = true;
                resizeStyle = $(e.target).attr('class');
                $(e.target).css({'background-color':'#ED6D06','border':0});
                var cursorStyle = $(e.target).css('cursor');
                $('body').css('cursor',cursorStyle);
            }else{
                //点击可移动区域
                $('body').css('cursor','move');
                isResize = false;
            }

            $(document).on('mousemove',_docMouseMoveHandler);
            $(document).on('mouseup',_docMouseUpHandler);
        });

        //定义document事件处理函数
        function _docMouseMoveHandler(e){
            if(isMouseDown){
                if( !isResize ){
                    _move(e);
                }else{
                    //根据点击点class调用相应尺寸调节方式
                    var clipAndCanvasInfo = _this.clipAndCanvasInfo;
                    _resizeClipFrame[resizeStyle](e);
                    _this.resetKeyPoint();
                }
            }
            return false;
        }
        function _docMouseUpHandler(e){
            $(document).off('mousemove',_docMouseMoveHandler);
            $(document).off('mouseup',_docMouseUpHandler);

            isMouseDown = false;
            //保存剪切框位置restore备用
            $('body').css('cursor','default');              
            $(_this.clipFrame).find('div').css({'background-color':'','border':'1px solid white'});
        }
        //clipFrame移动
        function _move(e){
            var left = e.clientX - distanceX,
                top = e.clientY - distanceY;
            var clipAndCanvasInfo = _this.clipAndCanvasInfo;

            //左边界
            if( (e.clientX - distanceX - minDis) <=  clipAndCanvasInfo.canvasLeft ){
                left = clipAndCanvasInfo.canvasLeft;
            }
            //右边界 注意加上2px border
            if( (e.clientX - distanceX + minDis ) >= (clipAndCanvasInfo.canvasLeft + clipAndCanvasInfo.canvasWidth - clipAndCanvasInfo.clipWidth -2 ) ){
                left = clipAndCanvasInfo.canvasLeft + clipAndCanvasInfo.canvasWidth - clipAndCanvasInfo.clipWidth -2;
            }
            //上边界
            if( (e.clientY - distanceY - minDis) <= clipAndCanvasInfo.canvasTop ){
                top = clipAndCanvasInfo.canvasTop;
            }
            //下边界
            if( (e.clientY - distanceY + minDis ) >= (clipAndCanvasInfo.canvasTop + clipAndCanvasInfo.canvasHeight - clipAndCanvasInfo.clipHeight -2 ) ){
                top = clipAndCanvasInfo.canvasTop + clipAndCanvasInfo.canvasHeight - clipAndCanvasInfo.clipHeight -2;
            }
            clipFrame.offset({'left':left,'top':top});
        };
    },
    /**
     * mousemove时设置resize点击点位置
     */
    resetKeyPoint:function(){
        var clipFrame = $(this.clipFrame);
        var w = clipFrame.width();
        var h = clipFrame.height();
        $('.toN').css('left',w/2-4);
        $('.toE').css('top',h/2-4);
        $('.toS').css('left',w/2-4);
        $('.toW').css('top',h/2-4);
    },
    /**
     * 根据剪切框位置和尺寸确定画布剪切坐标信息
     * @param {[String]} EVENT_TYPE [回调中触发的事件]
     */
    computeRectAndClip:function(nextEditType){
        var _this = this;
        var canvas = $(_this.canvas);
        var clipDom = _this.clipFrame?$(_this.clipFrame) : $('#clipFrame');//_this.clipFrame有时为空，但dom还在，暂时未找到逻辑漏洞

        var w = clipDom.width(),
            h = clipDom.height();
        var posX = clipDom.offset().left - canvas.offset().left,
            posY = clipDom.offset().top - canvas.offset().top;

        _this.doClips(_this.currentEditObj.initImg,[posX,posY,w,h],nextEditType);
        _this.currentEditObj.isAppClip = true;
    },
    /**
     * 选取编辑框内容重绘画布
     * @param {[Image]} img [基准图]
     * @param {[Array]} posArr [需剪切的位置和长宽等数据]
     * @param {[String]} EVENT_TYPE [回调中触发的事件]
     */
    doClips:function(img,posArr,nextEditType){
        //得出剪辑坐标，剪辑框长宽比
        //放大剪辑框里面图片
        var _this = this;
        var canvas = _this.canvas;

        //剪切后放大
        _this.resetCanvas(posArr[2],posArr[3],true);

        var context = _this.context;
        var _callback = function(){

            context.drawImage(this,posArr[0],posArr[1],posArr[2],posArr[3],0,0,canvas.width,canvas.height);

            _this.hideClipFrame();

            nextEditType && _this.changeEditType(nextEditType,true);
            
            $(_this.btn.restoreBtn).removeClass('restoreDisable');

            _this.clipCompleteTime = (new Date()).getTime();
            
        };
        _this.loadImg(img,_callback);
    },
    /**
     * 裁剪都为单步记数
     */
    restoreClip:function(){
        var _this = this;

        var _callback = function(){
            _this.resetCanvas(this.naturalWidth,this.naturalHeight,true);
            _this.context.drawImage(this,0,0);
            _this.changeEditObjWhenRestore();
        }
        _this.loadImg(_this.currentEditObj.initImg,_callback);
    },
    /**
     * 初始化马赛克功能
     */
    mosaic:function(){
        var _this = this;

        var canvas = _this.canvas;
        var context = _this.context;
        var isMouseDown =false;

        _this.setCursorAndBtn('m');//默认鼠标样式中号大小
        _this.lineWeight = _this.opts.lineWeight[1];
        $('.listIcon').show();

        $(canvas).off('mousedown.mosaic');
 
        _this.mosaicAble = true;

        $(canvas).on('mousedown.mosaic',function(e){
            if(!_this.mosaicAble){
                return;
            }
            
            if(_this.currentEditObj.editType != 'mosaic'){
                //无按钮切换直接画mosaic
                _this.justChangeEditObj('mosaic');
            }
            var currentEditObj = _this.currentEditObj;
            isMouseDown = true;
            
            var currentTrack = [];//保存当前绘制路径中的各点
            var canvasPos = $(canvas).offset();

            var x = e.clientX - (canvasPos.left - (document.documentElement.scrollLeft||document.body.scrollLeft));
            var y = e.clientY - (canvasPos.top - (document.documentElement.scrollTop||document.body.scrollTop));

            var resPoint = _this.drawMosaic([x,y]);
            currentTrack.push(resPoint);

            var lineWeight = _this.lineWeight;
            $(canvas).on('mousemove.mosaic',function(e){
                if(!isMouseDown)return;

                var x = e.clientX - (canvasPos.left - (document.documentElement.scrollLeft||document.body.scrollLeft));
                var y = e.clientY - (canvasPos.top - (document.documentElement.scrollTop||document.body.scrollTop));

                var len = currentTrack.length;
                //在同一马赛克块则不保存此点
                if((Math.floor(x/lineWeight) == Math.floor(currentTrack[len-1][0]/lineWeight)) && (Math.floor(y/lineWeight) == Math.floor(currentTrack[len-1][1]/lineWeight))){
                    return;
                }

                var resPoint = _this.drawMosaic([x,y]);
                currentTrack.push(resPoint);
            });
            $(document).on('mouseup.mosaic',function(){
                $(canvas).off('mousemove.mosaic');
                $(document).off('mouseup.mosaic');
                isMouseDown = false;

                //绘制完成一条路径则保存在历史轨迹中撤销时备用
                if(typeof currentEditObj.track == 'undefined')currentEditObj.track = [];
                currentEditObj.track.push(currentTrack);

                $(_this.btn.restoreBtn).removeClass('restoreDisable');
            });

        });
    },
    /**
     * 根据参数点位置绘制马赛克块并报获取到的颜色信息更新在history中，撤销时不需再计算
     */
    drawMosaic:function(point){
        var canvas = this.canvas;
        var context = this.context;
        
        // var currentTrack = this.currentTrack;

        var w = canvas.width;
        var h = canvas.height;

        //若是新绘制则计算该马赛克块的坐标等信息
        if( typeof point[2] == 'undefined'){//不是撤销重画
            var lineWeight = this.lineWeight;
            //赛克块横纵坐标
            var rectX = Math.floor(point[0]/lineWeight)*lineWeight;
            var rectY = Math.floor(point[1]/lineWeight)*lineWeight;
            //取鼠标位置颜色
            var data = context.getImageData(point[0],point[1],1,1).data;
            var fillStyle = 'rgba(' + data[0] +','+ data[1] +','+ data[2] +','+ data[3] + ')';
            point[2] = fillStyle;
            point[3] = rectX;
            point[4] = rectY;
            point[5] = (w > (rectX + lineWeight))?lineWeight:(w-rectX);
            point[6] = (h > (rectY + lineWeight))?lineWeight:(h-rectY);

            // currentTrack[currentTrack.length - 1] = point;

        }
        //撤销图片时不需再计算;
        context.fillStyle = point[2];
        // context.fillStyle = 'black';//测试，记得注释掉

        context.fillRect(point[3],point[4],point[5],point[6]);

        //返回数据保存在历史记录中下次撤销操作不再获取颜色值
        return point;
    },
    /**
     * 根据historyMosaicTrack，以currentApplicationImg为基准撤销马赛克笔迹
     */
    restoreMosaic:function(){
        var _this = this;

        var currentEditObj = _this.currentEditObj;
        var restRestoreCount = currentEditObj.track.length;
        if(restRestoreCount <= 0){
            return;
        }

        restRestoreCount -= 1;
        currentEditObj.track.pop();

        var _callback = function(){
            _this.context.drawImage(this,0,0);
            _this.reDrawMosaic();
            if(restRestoreCount == 0){
                //若是撤销旋转完成，删除当前的旋转历史数据
                _this.changeEditObjWhenRestore();
            }
        }
        _this.loadImg(currentEditObj.initImg,_callback);
    },
    /**
     * 遍历historyMosaicTrack中各点信息重绘马赛克到上一步
     */
    reDrawMosaic:function(){
        var historyMosaicTrack = this.currentEditObj.track;
        var restRestoreCount = historyMosaicTrack.length;
        

        for(var i = 0; i < restRestoreCount; i++ ){
            for(var j = 0,len = historyMosaicTrack[i].length;j < len;j++){
                this.drawMosaic(historyMosaicTrack[i][j]);
            }
        }
    },
    /**
     * 马赛克鼠标样式
     * @param  {String} lineType [画笔粗细类型]
     */
    setCursorAndBtn:function(lineType){
        var _this = this;

        var imgLoc = 'http://img.58cdn.com.cn/ui7/post/pc/imgs/';
        var style = $(_this.canvas).attr('style');
        var reg = /cursor:.+pointer;/;

        //置为默认
        if( !lineType ){
            style = style.replace(reg,'');
            $(_this.canvas).attr('style',style);
            return;
        }

        var cursorIcon = 'cursor:url('+imgLoc+lineType+'CursorIco.ico'+'),pointer;';
        style = (style?(style+';'):(''))+cursorIcon;
        $(_this.canvas).attr('style',style);

        //选中options按钮
        _this.setSelectedLine(lineType);
        
        //mosaic按钮样式
        var newLine = 'mosaic'+lineType.toUpperCase()+'Line';//mosaicMLine
        $('#mosaic').attr('class','button1 mosaicClick '+newLine);
    },
    setSelectedLine:function(lineType){
        $('.options').children('div').removeClass('selectedLine');
        $('.options').children('.'+lineType+'Line').addClass('selectedLine');
    },
    /**
     * 改变当前编辑数据，不执行下一步操作，用于mosaic 和 clip等初始化和执行操作是两个过程的编辑，防止重复绑定
     */
    justChangeEditObj:function(nextEditType){
        var _this = this;
        _this.storageEditHistory(nextEditType);
    },
    /**
     * 改变当前编辑数据，并执行下一步操作
     */
    changeEditType:function(nextEditType){
        var _this = this;
        _this.storageEditHistory(nextEditType);
        _this[nextEditType]();
    },
    /**
     * 保存当前编辑数据并切换编辑数据类型
     */
    storageEditHistory:function(nextEditType){
        var _this = this;
        //复制要push的对象currentEditObj不能再指向currentHistoryObj
        var currentEditObj = $.extend(true,{},_this.currentEditObj);
        var editType = currentEditObj.editType;

        switch(editType){
            case '':
                //type为空时数据为初始化数据，需保存
                _this.editHistory.push(currentEditObj);
                
                //保存完跟新currentHistoryObj
                _upDateCurEditObj();
                break;
            case 'rotate':
                var currentRotateCount = (typeof currentEditObj.step!='undefined')?(currentEditObj.step):0;
                
                //如果确实执行了doRotate,保存数据restore使用
                if(currentRotateCount != 0){
                    _this.editHistory.push(currentEditObj);
                }
                
                _upDateCurEditObj();
                break;
            case 'mosaic':
                var currentMosaicTrack = (typeof currentEditObj.track!='undefined')?(currentEditObj.track):([]);
                
                if(currentMosaicTrack.length != 0){
                    _this.editHistory.push(currentEditObj);
                }
                
                _upDateCurEditObj();
                break;
            case 'clip':
                if(typeof currentEditObj.isAppClip != 'undefined' && currentEditObj.isAppClip == true){
                    _this.editHistory.push(currentEditObj);
                }
                
                _upDateCurEditObj();
                break;
            case 'submitImage':
                //submit状态只是过渡状态，不需保存
                _upDateCurEditObj();
                break;
        }

        //切换编辑obj到下一个编辑类型
        function _upDateCurEditObj(){
            _this.currentEditObj = {};
            _this.currentEditObj.editType = nextEditType;
            _this.currentEditObj.initImg = _this.canvas.toDataURL('image/jpeg');
        }
    },
    changeEditObjWhenRestore:function(){
        var _this = this;

        var hislength =  _this.editHistory.length;
        
        if(hislength <= 1){
            //禁用
            $(_this.btn.restoreBtn).addClass('restoreDisable');
        }
        _this.currentEditObj = $.extend(true,{},_this.editHistory[hislength-1]);
        _this.editHistory.pop();
    },
    enableAllBtn:function(){
        var allBtn = this.btn;
        for(var index in allBtn){
            $(allBtn[index]).removeClass('edit_disabled_btn');
        }
    },
    disableAllBtn:function(){
        var allBtn = this.btn;
        for(var index in allBtn){
            $(allBtn[index]).addClass('edit_disabled_btn');
        }
    },
    /**
     * 弹框提示是否保存
     * @param {[String]} EVENT_TYPE [回调中触发的事件]
     */
    applyClipOrNot:function(nextEditType){
        var _this = this;

        //裁剪框，马赛克解绑
        $(_this.clipFrame).off('mousedown');

        //禁用功能操作按钮
        _this.disableAllBtn();

        if($('#dialog4MakeSure').length != 0){
            $('#shade4MakeSure').show();
            $('#dialog4MakeSure').show();
        }else{
            var shade4Confirm = '<div id="shade4MakeSure">'+
                                '</div>'+
                                '<div id="dialog4MakeSure">'+
                                    '<span>是否应用当前修改?</span><br>'+
                                    '<input type="button" class="application" value="应用">'+
                                    '<input type="button" class="giveUp" value="放弃">'+
                                '</div>';

            $(_this.editFrame).append(shade4Confirm);
        }
        $('#dialog4MakeSure input').off('click.makeSure');
        $('#dialog4MakeSure input').on('click.makeSure',function(e){
            if($(e.target).attr('value') == '应用' ){
                _this.computeRectAndClip(nextEditType);
            }else{
            //放弃裁剪
                _this.changeEditType(nextEditType);
                _this.hideClipFrame();   
            }
            _this.hideMakeSureFrame();
        });
    },
    hideMakeSureFrame:function(){
        $('#shade4MakeSure').hide();
        $('#dialog4MakeSure').hide();
        this.enableAllBtn();
    },
    hideClipFrame:function(){
        this.clipAble = false;
        $('#clipFrame').hide();
    },
    hideEditFrame:function(){
        var _this = this;

        $(_this.canvas).hide();
        //销毁编辑框和实例对象
        $('#shadeFrame').hide();
        $('#editFrame').hide();

        _this.hideMakeSureFrame();

        _this.hideClipFrame();

        $('.options').hide();
        $('.listIcon').hide();

        _this.setCursorAndBtn();
        $('body').off('selectstart');
        _this.listenOptionsShow('over');
        _this.changeWindowScroll('allow');
    }
};
