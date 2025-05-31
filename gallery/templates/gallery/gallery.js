"use strict";

/**
 * L'Egypte Gallery Application
 * 
 * A Flickr-based image gallery with tag filtering and slideshow functionality.
 * Images and metadata are provided by the Django backend via template variables.
 */

(function($) {
    // Module pattern to avoid global scope pollution
    const LegypteGallery = (function() {
        
        // ==================== Constants ====================
        const CONFIG = {
            DEFAULT_SLIDE_DURATION: 10000,
            CONTROL_PANEL_HIDE_DELAY: 10000,
            CONTROL_PANEL_HIDE_DURATION: 3000,
            WINDOW_PADDING: { width: 60, height: 60 },
            ANIMATIONS: {
                TAG_ROW_DURATION: 1000,
                CONTROL_PANEL_OPACITY: 0.9,
                CONTROL_PANEL_ICON_OPACITY: 0.3
            }
        };

        const SELECTORS = {
            // Control panel
            CONTROL_PANEL: '#control_panel',
            SHOW_CONTROL_PANEL: '#show_control_panel',
            CONTROL_PANEL_ICON: '#control_panel_icon',
            
            // Sources and tags
            SOURCES: '#sources',
            SOURCES_INSERTION_POINT: '#sources_insertion_point',
            TAG_BODY: '#tag_body',
            TAG_HEADER: '#tag_header',
            
            // Form controls
            START_SHOW: '#start_show',
            FULL_SCREEN: '#full_screen',
            SLIDE_DURATION: '#slide_duration',
            ANY_OR_ALL_ANY: '#any_or_all_any',
            ANY_OR_ALL_ALL: '#any_or_all_all',
            SELECT_ALL: '#select_all',
            CLEAR_ALL: '#clear_all',
            INCLUDE_UNTAGGED: '#include_untagged',
            
            // Display
            SLIDE_SHOW: '#slide_show',
            NO_IMAGES_SELECTED: '#no_images_selected'
        };

        // ==================== State Management ====================
        const state = {
            // Image data from Django
            images: [],
            sources: {},
            
            // Current state
            currentImageIndex: 0,
            nextImageIndex: 0,
            timer: null,
            
            // User preferences
            activeSources: {},
            tags: {},
            showUntagged: false,
            tagMatchMode: 'any', // 'any' or 'all'
            slideDuration: CONFIG.DEFAULT_SLIDE_DURATION
        };

        // ==================== Image Management ====================
        const ImageManager = {
            /**
             * Find the best image size for current window dimensions
             */
            getBestSize(image) {
                if (!image || !image.sizes || image.sizes.length === 0) {
                    return null;
                }

                const windowWidth = $(window).width() - CONFIG.WINDOW_PADDING.width;
                const windowHeight = $(window).height() - CONFIG.WINDOW_PADDING.height;
                const sizes = image.sizes;
                
                // Default to largest image
                let bestSize = sizes[sizes.length - 1];
                
                // Find smallest image that's bigger than display area
                for (const size of sizes) {
                    const imgWidth = parseInt(size.width);
                    const imgHeight = parseInt(size.height);
                    
                    if (imgWidth >= windowWidth && imgHeight >= windowHeight) {
                        bestSize = size;
                        break;
                    }
                }
                
                // Calculate display dimensions
                const heightRatio = bestSize.height / windowHeight;
                const widthRatio = bestSize.width / windowWidth;
                const maxRatio = Math.max(heightRatio, widthRatio);
                
                return {
                    url: bestSize.url,
                    imgWidth: maxRatio > 1 ? Math.floor(bestSize.width / maxRatio) : bestSize.width,
                    imgHeight: maxRatio > 1 ? Math.floor(bestSize.height / maxRatio) : bestSize.height
                };
            },

            /**
             * Get the next valid image index based on current filters
             */
            getNextImageIndex() {
                if (state.images.length === 0) return 0;
                
                const startIndex = state.currentImageIndex;
                let candidateIndex = state.currentImageIndex;
                
                do {
                    candidateIndex = (candidateIndex + 1) % state.images.length;
                    const candidate = state.images[candidateIndex];
                    
                    if (this.isImageValid(candidate)) {
                        return candidateIndex;
                    }
                } while (candidateIndex !== startIndex);
                
                // No valid images found
                return -1;
            },

            /**
             * Check if image matches current filter criteria
             */
            isImageValid(image) {
                return this.sourcesMatch(image) && this.tagsMatch(image);
            },

            /**
             * Check if image has an active source
             */
            sourcesMatch(image) {
                for (const source in state.activeSources) {
                    if (state.activeSources.hasOwnProperty(source) && 
                        image.sources.hasOwnProperty(source)) {
                        return true;
                    }
                }
                return false;
            },

            /**
             * Check if image tags match current filter settings
             */
            tagsMatch(image) {
                const imageTags = Object.keys(image.tags);
                
                // Handle untagged images
                if (imageTags.length === 0) {
                    return state.showUntagged;
                }
                
                // Check for excluded tags
                if (this.hasExcludedTag(image)) {
                    return false;
                }
                
                // Check included tags
                const includedTags = this.getIncludedTags();
                if (includedTags.length === 0) {
                    return true; // No filters applied
                }
                
                if (state.tagMatchMode === 'any') {
                    return includedTags.some(tag => imageTags.includes(tag));
                } else { // 'all'
                    return includedTags.every(tag => imageTags.includes(tag));
                }
            },

            /**
             * Check if image has any excluded tags
             */
            hasExcludedTag(image) {
                for (const tag in image.tags) {
                    if (!image.tags.hasOwnProperty(tag)) continue;
                    
                    const tagId = state.tags[tag]?.tagIdPrefix;
                    if (tagId && $(`#${tagId}_exclude`).is(':checked')) {
                        return true;
                    }
                }
                return false;
            },

            /**
             * Get list of currently included tags
             */
            getIncludedTags() {
                const includedTags = [];
                for (const tag in state.tags) {
                    if (!state.tags.hasOwnProperty(tag)) continue;
                    
                    const tagProps = state.tags[tag];
                    if (tagProps.visible && tagProps.setting === 'include') {
                        includedTags.push(tag);
                    }
                }
                return includedTags;
            }
        };

        // ==================== UI Management ====================
        const UIManager = {
            /**
             * Initialize the control panel
             */
            initControlPanel() {
                $(SELECTORS.CONTROL_PANEL).css({ opacity: 0.5, display: 'none' });
                $(SELECTORS.SHOW_CONTROL_PANEL).css({ opacity: CONFIG.ANIMATIONS.CONTROL_PANEL_ICON_OPACITY });
                
                this.populateSourcesAndTags();
            },

            /**
             * Populate sources and tags in the control panel
             */
            populateSourcesAndTags() {
                const sourceElements = [];
                const tagElements = [];
                
                // Process sources
                for (const source in state.sources) {
                    if (!state.sources.hasOwnProperty(source)) continue;
                    
                    // Create source checkbox
                    sourceElements.push(
                        `<label><input type="checkbox" name="${source}" id="${source}" />` +
                        `${state.sources[source].display}</label>`
                    );
                    
                    state.activeSources[source] = 1;
                    
                    // Process tags for this source
                    const sourceTags = state.sources[source].tags;
                    for (const tag in sourceTags) {
                        if (!sourceTags.hasOwnProperty(tag)) continue;
                        
                        if (!state.tags[tag]) {
                            state.tags[tag] = {
                                activeSources: {},
                                tagIdPrefix: sourceTags[tag],
                                visible: true,
                                setting: 'unset'
                            };
                        }
                        state.tags[tag].activeSources[source] = 1;
                    }
                }
                
                // Create tag rows (sorted alphabetically)
                const sortedTags = Object.keys(state.tags).sort((a, b) => 
                    a.toLowerCase().localeCompare(b.toLowerCase())
                );
                
                for (const tag of sortedTags) {
                    const tagId = state.tags[tag].tagIdPrefix;
                    tagElements.push(this.createTagRowHtml(tag, tagId));
                }
                
                // Insert into DOM
                $(SELECTORS.SOURCES_INSERTION_POINT).append(sourceElements.join(''));
                $(SELECTORS.TAG_BODY).append(tagElements.join(''));
                
                // Initialize all sources as checked
                $(`${SELECTORS.SOURCES} :checkbox`).prop('checked', true).change();
                
                // Select all tags by default
                $(SELECTORS.SELECT_ALL).click();
            },

            /**
             * Create HTML for a tag row
             */
            createTagRowHtml(tag, tagId) {
                return `<tr id="${tagId}_row">` +
                    `<td>${tag}</td>` +
                    `<td><input type="radio" name="${tagId}" id="${tagId}_include" value="include" /></td>` +
                    `<td><input type="radio" name="${tagId}" id="${tagId}_exclude" value="exclude" /></td>` +
                    `</tr>`;
            },

            /**
             * Show/hide control panel
             */
            showControlPanel() {
                $(SELECTORS.CONTROL_PANEL)
                    .stop(true, true)
                    .slideDown()
                    .animate({ opacity: CONFIG.ANIMATIONS.CONTROL_PANEL_OPACITY });
                
                $(SELECTORS.SHOW_CONTROL_PANEL)
                    .stop(true, true)
                    .animate({ opacity: 1 });
            },

            hideControlPanel(opacity = 0, duration = CONFIG.CONTROL_PANEL_HIDE_DURATION) {
                $(SELECTORS.CONTROL_PANEL).slideUp().css('opacity', 0.3);
                $(SELECTORS.SHOW_CONTROL_PANEL).animate({ opacity: opacity }, duration);
            },

            /**
             * Update tag visibility based on active sources
             */
            updateTagVisibility(enabledSources, disabledSources) {
                const tagsToShow = [];
                const tagsToHide = [];
                
                // Process enabled sources
                for (const source of enabledSources) {
                    const sourceTags = state.sources[source].tags;
                    for (const tag in sourceTags) {
                        if (!sourceTags.hasOwnProperty(tag)) continue;
                        
                        state.tags[tag].activeSources[source] = 1;
                        if (Object.keys(state.tags[tag].activeSources).length === 1) {
                            tagsToShow.push(tag);
                        }
                    }
                }
                
                // Process disabled sources
                for (const source of disabledSources) {
                    const sourceTags = state.sources[source].tags;
                    for (const tag in sourceTags) {
                        if (!sourceTags.hasOwnProperty(tag) || !state.tags[tag]) continue;
                        
                        delete state.tags[tag].activeSources[source];
                        if (Object.keys(state.tags[tag].activeSources).length === 0) {
                            tagsToHide.push(tag);
                        }
                    }
                }
                
                // Update UI
                this.animateTagRows(tagsToShow, true);
                this.animateTagRows(tagsToHide, false);
            },

            /**
             * Animate tag rows show/hide
             */
            animateTagRows(tags, show) {
                if (tags.length === 0) return;
                
                const selector = tags
                    .map(tag => `#${state.tags[tag].tagIdPrefix}_row`)
                    .join(',');
                
                if (show) {
                    $(selector).show(CONFIG.ANIMATIONS.TAG_ROW_DURATION);
                    tags.forEach(tag => { state.tags[tag].visible = true; });
                } else {
                    $(selector).hide(CONFIG.ANIMATIONS.TAG_ROW_DURATION);
                    tags.forEach(tag => { state.tags[tag].visible = false; });
                }
            },

            /**
             * Display error message
             */
            showError(message) {
                $(SELECTORS.NO_IMAGES_SELECTED)
                    .text(message)
                    .css('display', 'block');
            },

            hideError() {
                $(SELECTORS.NO_IMAGES_SELECTED).css('display', 'none');
            }
        };

        // ==================== Slideshow Management ====================
        const SlideshowManager = {
            /**
             * Start or continue the slideshow
             */
            start() {
                // Check if we have images
                if (state.images.length === 0) {
                    UIManager.showError('No images available from Flickr');
                    return;
                }
                
                // Display current image
                state.currentImageIndex = state.nextImageIndex;
                const currentImage = state.images[state.currentImageIndex];
                const imageSize = ImageManager.getBestSize(currentImage);
                
                if (imageSize) {
                    $(SELECTORS.SLIDE_SHOW)
                        .attr('src', imageSize.url)
                        .width(imageSize.imgWidth)
                        .height(imageSize.imgHeight);
                }
                
                // Schedule next image
                clearTimeout(state.timer);
                state.timer = setTimeout(() => this.start(), state.slideDuration);
                
                // Preload next image
                state.nextImageIndex = ImageManager.getNextImageIndex();
                if (state.nextImageIndex === -1) {
                    UIManager.showError('No Images Match Your Selection Criteria');
                    state.nextImageIndex = 0;
                } else {
                    UIManager.hideError();
                    this.preloadImage(state.nextImageIndex);
                }
            },

            /**
             * Preload next image for smooth transitions
             */
            preloadImage(index) {
                if (index >= 0 && index < state.images.length) {
                    const nextImage = state.images[index];
                    const imageSize = ImageManager.getBestSize(nextImage);
                    
                    if (imageSize) {
                        $('<img/>')
                            .attr('src', imageSize.url)
                            .width(imageSize.imgWidth)
                            .height(imageSize.imgHeight);
                    }
                }
            },

            /**
             * Handle window resize
             */
            handleResize() {
                if (state.currentImageIndex < state.images.length) {
                    const currentImage = state.images[state.currentImageIndex];
                    const imageSize = ImageManager.getBestSize(currentImage);
                    
                    if (imageSize) {
                        $(SELECTORS.SLIDE_SHOW)
                            .attr('src', imageSize.url)
                            .width(imageSize.imgWidth)
                            .height(imageSize.imgHeight);
                    }
                }
                
                // Adjust control panel height
                $(SELECTORS.CONTROL_PANEL).css('height', ($(window).height() - 50) + 'px');
            }
        };

        // ==================== Event Handlers ====================
        const EventHandlers = {
            /**
             * Initialize all event handlers
             */
            init() {
                // Window events
                $(window).resize(() => SlideshowManager.handleResize());
                
                // Control panel visibility
                $(SELECTORS.SHOW_CONTROL_PANEL).mouseenter(() => UIManager.showControlPanel());
                $(SELECTORS.CONTROL_PANEL).mouseleave(() => 
                    UIManager.hideControlPanel(0.2, CONFIG.CONTROL_PANEL_HIDE_DELAY)
                );
                
                // Form controls
                $(SELECTORS.START_SHOW).on('click', () => this.handleStartShow());
                $(SELECTORS.FULL_SCREEN).on('click', () => this.handleFullScreen());
                $(SELECTORS.SLIDE_DURATION).on('change', (e) => this.handleSlideDurationChange(e));
                
                // Tag controls
                $(SELECTORS.ANY_OR_ALL_ANY).on('change', (e) => this.handleTagModeChange(e));
                $(SELECTORS.ANY_OR_ALL_ALL).on('change', (e) => this.handleTagModeChange(e));
                $(SELECTORS.SELECT_ALL).on('click', () => this.handleSelectAllTags(true));
                $(SELECTORS.CLEAR_ALL).on('click', () => this.handleSelectAllTags(false));
                $(SELECTORS.INCLUDE_UNTAGGED).on('change', (e) => this.handleUntaggedChange(e));
                
                // Dynamic event handlers
                $(SELECTORS.SOURCES).on('change', (e) => this.handleSourceChange(e));
                $('#tags').on('change', (e) => this.handleTagChange(e));
            },

            handleStartShow() {
                UIManager.hideControlPanel(0, CONFIG.CONTROL_PANEL_HIDE_DURATION);
                state.nextImageIndex = ImageManager.getNextImageIndex();
                SlideshowManager.start();
            },

            handleFullScreen() {
                const docElm = document.documentElement;
                const isFullScreen = document.fullScreenElement || 
                                   document.mozFullScreen || 
                                   document.webkitIsFullScreen;
                
                if (!isFullScreen) {
                    if (docElm.requestFullscreen) {
                        docElm.requestFullscreen();
                    } else if (docElm.mozRequestFullScreen) {
                        docElm.mozRequestFullScreen();
                    } else if (docElm.webkitRequestFullScreen) {
                        docElm.webkitRequestFullScreen();
                    }
                }
            },

            handleSlideDurationChange(event) {
                const duration = Number(event.target.value);
                if (duration && duration > 0) {
                    state.slideDuration = duration * 1000;
                    SlideshowManager.start();
                }
            },

            handleTagModeChange(event) {
                state.tagMatchMode = event.target.value;
            },

            handleUntaggedChange(event) {
                state.showUntagged = event.target.checked;
            },

            handleSelectAllTags(select) {
                $('#tags input:radio[value="include"]')
                    .prop('checked', select)
                    .change();
            },

            handleSourceChange() {
                const checkedSources = [];
                const enabledSources = [];
                const disabledSources = [];
                
                // Get currently checked sources
                $(`${SELECTORS.SOURCES} input:checked`).each(function() {
                    checkedSources.push(this.id);
                });
                
                // Determine changes
                for (const source in state.sources) {
                    if (!state.sources.hasOwnProperty(source)) continue;
                    
                    const isChecked = checkedSources.includes(source);
                    const wasActive = source in state.activeSources;
                    
                    if (isChecked && !wasActive) {
                        enabledSources.push(source);
                        state.activeSources[source] = 1;
                    } else if (!isChecked && wasActive) {
                        disabledSources.push(source);
                        delete state.activeSources[source];
                    }
                }
                
                UIManager.updateTagVisibility(enabledSources, disabledSources);
            },

            handleTagChange(event) {
                const targetId = event.target.id;
                if (!targetId.startsWith('tag_id')) return;
                
                const tag = this.getTagById(targetId);
                if (!tag) return;
                
                const isInclude = targetId.endsWith('_include');
                const isChecked = event.target.checked;
                
                if (isChecked) {
                    state.tags[tag].setting = isInclude ? 'include' : 'exclude';
                } else if ((isInclude && state.tags[tag].setting === 'include') ||
                          (!isInclude && state.tags[tag].setting === 'exclude')) {
                    state.tags[tag].setting = 'unset';
                }
            },

            getTagById(tagId) {
                const prefix = tagId.replace(/_include$|_exclude$/, '');
                for (const tag in state.tags) {
                    if (state.tags[tag].tagIdPrefix === prefix) {
                        return tag;
                    }
                }
                return null;
            }
        };

        // ==================== Public API ====================
        return {
            /**
             * Initialize the gallery with data from Django
             */
            init(images, sources) {
                // Set initial data
                state.images = images || [];
                state.sources = sources || {};
                
                // Initialize components
                UIManager.initControlPanel();
                EventHandlers.init();
                
                // Start slideshow
                SlideshowManager.start();
            }
        };
    })();

    // ==================== Initialize on Document Ready ====================
    $(document).ready(function() {
        // Data is injected by Django template
        const images = {{ images|safe }};
        const sources = {{ sources|safe }};
        
        LegypteGallery.init(images, sources);
    });

})(jQuery);