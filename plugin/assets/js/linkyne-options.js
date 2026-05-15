jQuery(document).ready(function($) {
    
    function getBasePrice() { return parseFloat($('.linkyne-global-options-wrapper').first().data('base-price')) || 0; }
    function getBaseImage() { return $('#linkyne-standalone-gallery').data('base-image') || ''; }

    function autoSelectOptions() {
        $('.linkyne-option-group:visible').each(function() {
            if ($(this).find('.linkyne-swatch.selected').length === 0) {
                $(this).find('.linkyne-swatch').first().trigger('click');
            }
        });
    }

    function checkConditionalLogic() {
        var selectedValues = [];
        $('.linkyne-hidden-selection').each(function() { if ($(this).val()) selectedValues.push($(this).val()); });

        $('.linkyne-option-group').each(function() {
            var $group = $(this);
            var condition = $group.data('condition');
            if (condition) {
                if (selectedValues.includes(condition)) {
                    $group.show();
                } else {
                    $group.hide();
                    $group.find('.linkyne-swatch').removeClass('selected');
                    $group.find('.linkyne-hidden-selection, .linkyne-hidden-price').val(0);
                }
            }
        });
        autoSelectOptions(); 
    }

    $(document).on('click', '.linkyne-swatch', function() {
        var $this = $(this);
        var $wrapper = $this.closest('.linkyne-swatches-wrapper');
        var $group = $this.closest('.linkyne-option-group');
        
        $wrapper.find('.linkyne-swatch').removeClass('selected');
        $this.addClass('selected');
		
        $group.find('.linkyne-dynamic-title-append').text(' - ' + $this.data('value'));

        var priceType = $this.data('price-type');
        var priceVal = parseFloat($this.data('price-val')) || 0;
        var calculatedExtraCost = (priceType === 'flat') ? priceVal : (priceType === 'percent') ? (getBasePrice() * (priceVal / 100)) : 0;

        $group.find('.linkyne-hidden-selection').val($this.data('value'));
        $group.find('.linkyne-hidden-price').val(calculatedExtraCost.toFixed(2));

        var currentTotal = getBasePrice();
        $('.linkyne-hidden-price').each(function() { currentTotal += (parseFloat($(this).val()) || 0); });
        $('.linkyne-live-total').html('$' + currentTotal.toFixed(2));

        checkConditionalLogic();
        updateGallerySandwich($this.data('gallery'));
    });

    var currentSlideIndex = 0;

    function adjustSliderHeight() {
        var $container = $('.linkyne-slider-container');
        var $activeSlide = $('.linkyne-slide.active-slide');
        if (!$activeSlide.length) return;

        function setHeight() {
            var h = $activeSlide.children().first().outerHeight(); 
            var minHeight = $(window).width() <= 768 ? 200 : 400; 
            if (h < minHeight) h = minHeight; 
            $container.css('height', h + 'px');
        }

        setHeight();
        $activeSlide.find('img').on('load', setHeight);
    }

    $(window).on('resize', adjustSliderHeight);

    function updateGallerySandwich(galleryData) {
        if (!galleryData || galleryData.length === 0) {
            $('.linkyne-gallery-loader').removeClass('active');
            return;
        }

        // 1. Instantly trigger the Frosted Glass Loader!
        $('.linkyne-gallery-loader').addClass('active');

        currentSlideIndex = 0; 
        var baseImgUrl = getBaseImage();
        var html = '<div class="linkyne-slider-container">';

        // (The zoom icon logic is removed here because we moved it safely to the PHP wrapper)

        $.each(galleryData, function(index, media) {
            var activeClass = (index === 0) ? 'active-slide' : '';
            html += `<div class="linkyne-slide ${activeClass}" data-index="${index}">`;
            
            if (media.type === 'sandwich') {
                html += `
                <div class="linkyne-sandwich-wrapper">
                    <img class="linkyne-mockup-frame" src="${media.url}">
                    <img class="linkyne-base-art" src="${baseImgUrl}" style="top:${media.top}%; left:${media.left}%; width:${media.width}%; height:${media.height}%;">
                </div>`;
            } else if (media.type === 'simple') {
                html += `<img src="${media.url}" style="width:100%; height:auto; display:block;">`;
            }
            html += `</div>`;
        });

        if (galleryData.length > 1) {
            html += `<button class="linkyne-slider-btn prev-btn">&#10094;</button>`;
            html += `<button class="linkyne-slider-btn next-btn">&#10095;</button>`;
            html += `<div class="linkyne-slider-dots">`;
            for (let i = 0; i < galleryData.length; i++) {
                var activeDot = (i === 0) ? 'active-dot' : '';
                html += `<span class="linkyne-dot ${activeDot}" data-index="${i}"></span>`;
            }
            html += `</div>`;
        }
        html += '</div>';
        
        // Inject into the new safe inner wrapper
        $('#linkyne-gallery-inner').html(html);
        
        // 2. The Image Tracker: Wait until every image is downloaded before removing loader
        var $activeImages = $('.linkyne-slide.active-slide').find('img');
        var imagesToLoad = $activeImages.length;
        var imagesLoaded = 0;

        function checkLoadComplete() {
            if (imagesLoaded >= imagesToLoad) {
                adjustSliderHeight(); 
                $('.linkyne-gallery-loader').removeClass('active'); // Turn off loader!
            }
        }

        if (imagesToLoad === 0) {
            checkLoadComplete();
        } else {
            $activeImages.each(function() {
                if (this.complete) {
                    imagesLoaded++;
                    checkLoadComplete();
                } else {
                    $(this).on('load error', function() {
                        imagesLoaded++;
                        checkLoadComplete();
                    });
                }
            });
        }
    }

    $(document).on('click', '.linkyne-slider-btn', function(e) {
        e.preventDefault();
        var $slides = $('.linkyne-slide');
        var $dots = $('.linkyne-dot');
        var totalSlides = $slides.length;

        if ($(this).hasClass('next-btn')) { currentSlideIndex = (currentSlideIndex + 1) % totalSlides; } 
        else { currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides; }

        $slides.removeClass('active-slide');
        $dots.removeClass('active-dot');
        $slides.eq(currentSlideIndex).addClass('active-slide');
        $dots.eq(currentSlideIndex).addClass('active-dot');
        adjustSliderHeight(); 
    });

    $(document).on('click', '.linkyne-dot', function() {
        var $slides = $('.linkyne-slide');
        var $dots = $('.linkyne-dot');
        currentSlideIndex = $(this).data('index');

        $slides.removeClass('active-slide');
        $dots.removeClass('active-dot');
        $slides.eq(currentSlideIndex).addClass('active-slide');
        $dots.eq(currentSlideIndex).addClass('active-dot');
        adjustSliderHeight(); 
    });

    // Initialize (With fallback to hide loader if the product has zero options)
    setTimeout(function() {
        checkConditionalLogic();
        if ($('.linkyne-swatch').length === 0) {
            $('.linkyne-gallery-loader').removeClass('active');
        }
    }, 100);

    var touchStartX = 0;
    var touchEndX = 0;
    var isDragging = false;

    $(document).on('touchstart mousedown', '#linkyne-standalone-gallery .linkyne-slider-container', function(e) {
        if ($(e.target).closest('.linkyne-slider-btn, .linkyne-dot, .linkyne-zoom-icon').length) return;
        
        if (e.type === 'touchstart') { touchStartX = e.originalEvent.touches[0].clientX; } 
        else {
            touchStartX = e.clientX;
            isDragging = true;
            e.preventDefault(); 
        }
        touchEndX = touchStartX; 
    });

    $(document).on('touchmove mousemove', '#linkyne-standalone-gallery .linkyne-slider-container', function(e) {
        if (e.type === 'mousemove' && !isDragging) return;
        if (e.type === 'touchmove') { touchEndX = e.originalEvent.touches[0].clientX; } 
        else { touchEndX = e.clientX; }
    });

    $(document).on('touchend mouseup mouseleave', '#linkyne-standalone-gallery .linkyne-slider-container', function(e) {
        if (e.type !== 'touchend' && !isDragging) return;
        isDragging = false;
        var swipeDistance = touchStartX - touchEndX;
        var threshold = 50; 

        if (swipeDistance > threshold) { $('.linkyne-slider-btn.next-btn').trigger('click'); } 
        else if (swipeDistance < -threshold) { $('.linkyne-slider-btn.prev-btn').trigger('click'); }
    });

    // --- PREMIUM GLIGHTBOX INTEGRATION ---
    var myLightbox = null;
    if (typeof GLightbox !== 'undefined') {
        myLightbox = GLightbox({
            selector: '.linkyne-glightbox',
            touchNavigation: true,
            loop: true,
            zoomable: true,
            draggable: true
        });
    }

    $(document).on('click', '.linkyne-zoom-icon', function(e) {
        e.preventDefault();
        if (myLightbox) { myLightbox.open(); }
    });
}); 
