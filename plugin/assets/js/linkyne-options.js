jQuery(document).ready(function($) {
    
    function getBasePrice() { return parseFloat($('.linkyne-global-options-wrapper').first().data('base-price')) || 0; }
    function getBaseImage() { return $('#linkyne-standalone-gallery').data('base-image') || ''; }

    // FIXED: Only auto-select if NO swatches in the group are currently selected
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

    // THE CLICK EVENT
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

    // CUSTOM SLIDER ENGINE
    var currentSlideIndex = 0;

    function updateGallerySandwich(galleryData) {
        if (!galleryData || galleryData.length === 0) return;

        currentSlideIndex = 0; // Reset slider to first image
        var baseImgUrl = getBaseImage();
        var html = '<div class="linkyne-slider-container">';

        // 1. Build the Slides
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
                html += `<img src="${media.url}" style="width:100%; height:100%; object-fit:contain; display:block;">`;
            }
            html += `</div>`;
        });

        // 2. Build the Arrows (Only if more than 1 image)
        if (galleryData.length > 1) {
            html += `<button class="linkyne-slider-btn prev-btn">&#10094;</button>`;
            html += `<button class="linkyne-slider-btn next-btn">&#10095;</button>`;
            
            // Build the Dots
            html += `<div class="linkyne-slider-dots">`;
            for (let i = 0; i < galleryData.length; i++) {
                var activeDot = (i === 0) ? 'active-dot' : '';
                html += `<span class="linkyne-dot ${activeDot}" data-index="${i}"></span>`;
            }
            html += `</div>`;
        }

        html += '</div>';
        $('#linkyne-standalone-gallery').html(html);
    }

    // SLIDER CLICK HANDLERS
    $(document).on('click', '.linkyne-slider-btn', function(e) {
        e.preventDefault();
        var $slides = $('.linkyne-slide');
        var $dots = $('.linkyne-dot');
        var totalSlides = $slides.length;

        if ($(this).hasClass('next-btn')) {
            currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
        } else {
            currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
        }

        $slides.removeClass('active-slide');
        $dots.removeClass('active-dot');
        
        $slides.eq(currentSlideIndex).addClass('active-slide');
        $dots.eq(currentSlideIndex).addClass('active-dot');
    });

    $(document).on('click', '.linkyne-dot', function() {
        var $slides = $('.linkyne-slide');
        var $dots = $('.linkyne-dot');
        currentSlideIndex = $(this).data('index');

        $slides.removeClass('active-slide');
        $dots.removeClass('active-dot');
        
        $slides.eq(currentSlideIndex).addClass('active-slide');
        $dots.eq(currentSlideIndex).addClass('active-dot');
    });

    // Initialize
    setTimeout(checkConditionalLogic, 100);

	// --- SWIPE AND DRAG GESTURES FOR SLIDER ---
    var touchStartX = 0;
    var touchEndX = 0;
    var isDragging = false;

    $(document).on('touchstart mousedown', '#linkyne-standalone-gallery .linkyne-slider-container', function(e) {
        // Don't trigger drag if they are clicking the arrows or dots
        if ($(e.target).closest('.linkyne-slider-btn, .linkyne-dot').length) return;
        
        if (e.type === 'touchstart') {
            touchStartX = e.originalEvent.touches[0].clientX;
        } else {
            touchStartX = e.clientX;
            isDragging = true;
            e.preventDefault(); // Prevents the browser's default "ghost image" dragging
        }
        touchEndX = touchStartX; // Reset end position
    });

    $(document).on('touchmove mousemove', '#linkyne-standalone-gallery .linkyne-slider-container', function(e) {
        if (e.type === 'mousemove' && !isDragging) return;
        
        if (e.type === 'touchmove') {
            touchEndX = e.originalEvent.touches[0].clientX;
        } else {
            touchEndX = e.clientX;
        }
    });

    $(document).on('touchend mouseup mouseleave', '#linkyne-standalone-gallery .linkyne-slider-container', function(e) {
        if (e.type !== 'touchend' && !isDragging) return;
        isDragging = false;
        
        var swipeDistance = touchStartX - touchEndX;
        var threshold = 50; // Minimum pixel distance to trigger a slide change

        if (swipeDistance > threshold) {
            // Swiped Left -> Next Slide
            $('.linkyne-slider-btn.next-btn').trigger('click');
        } else if (swipeDistance < -threshold) {
            // Swiped Right -> Previous Slide
            $('.linkyne-slider-btn.prev-btn').trigger('click');
        }
    });
});
