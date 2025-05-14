// Initialize VK Mini App
document.addEventListener('DOMContentLoaded', function() {
    // Initialize VK Mini App
    vkBridge.send('VKWebAppInit');
    
    // IMPORTANT: Force production mode for testing with VK Cloud
    const isLocalDevelopment = false; 
    
    console.log("Running in " + (isLocalDevelopment ? "development" : "production") + " mode");
    
    // Base configuration
    const config = {
        // Base URL for VK Cloud storage - update with your actual bucket URL
        baseUrl: 'https://hb.bizmrg.com/YOUR_BUCKET_NAME/radiocases',
        currentCase: null,
        currentPart: 1, // 1 for sequences, 2 for results
        sequences: {
            currentSeries: null,
            allSeries: [],
            currentImageIndex: 1,
            totalImages: 0
        },
        results: {
            currentImageIndex: 1,
            totalImages: 0
        },
        vibrationMode: 'none',
        vibrationPatterns: {
            none: [],
            light: [50],
            medium: [100, 50, 100],
            strong: [200, 100, 200, 100, 200]
        }
    };
    
    // DOM Elements - Grid View
    const gridElements = {
        gridView: document.getElementById('grid-view'),
        casesGrid: document.getElementById('cases-grid'),
        loadingGrid: document.getElementById('loading-grid')
    };
    
    // DOM Elements - Case View
    const caseElements = {
        caseView: document.getElementById('case-view'),
        backButton: document.getElementById('back-button'),
        caseTitle: document.getElementById('case-title'),
        loadingCase: document.getElementById('loading-case'),
        
        // Part navigation
        prevPartButton: document.getElementById('prev-part'),
        nextPartButton: document.getElementById('next-part'),
        partIndicator: document.getElementById('part-indicator'),
        
        // Part 1: Sequences
        partSequences: document.getElementById('part-sequences'),
        seriesSelector: document.getElementById('series-selector'),
        sequenceImage: document.getElementById('sequence-image'),
        imageSlider: document.getElementById('image-slider'),
        prevImageButton: document.getElementById('prev-image'),
        nextImageButton: document.getElementById('next-image'),
        imageInfo: document.getElementById('image-info'),
        seriesInfo: document.getElementById('series-info'),
        caseAnnotation: document.getElementById('case-annotation'),
        
        // Part 2: Results
        partResults: document.getElementById('part-results'),
        resultImage: document.getElementById('result-image'),
        resultSlider: document.getElementById('result-slider'),
        prevResultButton: document.getElementById('prev-result'),
        nextResultButton: document.getElementById('next-result'),
        resultInfo: document.getElementById('result-info'),
        resultText: document.getElementById('result-text'),
        
        // Controls
        vibrationMode: document.getElementById('vibration-mode')
    };
    
    // Function to check if Vibration API is supported
    function isVibrationSupported() {
        return 'vibrate' in navigator;
    }
    
    // Function to vibrate based on selected mode
    function vibrate() {
        if (isVibrationSupported() && config.vibrationMode !== 'none') {
            navigator.vibrate(config.vibrationPatterns[config.vibrationMode]);
        }
    }
    
    // Function to show loading spinner
    function showLoading(element) {
        element.classList.remove('hidden');
    }
    
    // Function to hide loading spinner
    function hideLoading(element) {
        element.classList.add('hidden');
    }
    
    // Function to switch between views
    function switchView(fromView, toView) {
        fromView.classList.add('hidden');
        toView.classList.remove('hidden');
    }
    
    // Function to switch between case parts
    function switchCasePart(part) {
        config.currentPart = part;
        
        if (part === 1) {
            caseElements.partSequences.classList.remove('hidden');
            caseElements.partResults.classList.add('hidden');
            caseElements.partIndicator.textContent = 'Part 1: Sequences';
            caseElements.prevPartButton.disabled = true;
            caseElements.nextPartButton.disabled = false;
        } else {
            caseElements.partSequences.classList.add('hidden');
            caseElements.partResults.classList.remove('hidden');
            caseElements.partIndicator.textContent = 'Part 2: Results';
            caseElements.prevPartButton.disabled = false;
            caseElements.nextPartButton.disabled = true;
            
            // Load results if not loaded yet
            if (config.results.totalImages === 0) {
                loadResultImages();
            }
        }
    }
    
    // Function to fetch text file content
    async function fetchTextFile(url) {
        console.log(`Fetching text file: ${url}`);
        
        try {
            // Option 1: Direct access if bucket is public
            // const response = await fetch(url, {
            //     method: 'GET',
            //     mode: 'cors',
            //     cache: 'no-cache',
            //     credentials: 'omit'
            // });
            
            // Option 2: Using backend to get signed URL (recommended for security)
            // Replace 'https://your-backend-url.com' with your actual backend URL
            const backendUrl = 'https://your-backend-url.com';
            const response = await fetch(`${backendUrl}/api/getTextFile?key=${encodeURIComponent(url)}`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            
            console.log(`Fetch response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log(`Fetched text content (length: ${text.length}): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            return text;
        } catch (error) {
            console.error(`Error fetching text file: ${error.message}`);
            return null;
        }
    }
    
    // Function to load all cases for the grid view
    async function loadAllCases() {
        showLoading(gridElements.loadingGrid);
        console.log("Loading cases from VK Cloud...");
        
        try {
            // Option 1: Get cases directly from the storage (if public)
            // let cases = [
            //     { id: 'case1', title: 'Loading...' }
            // ];
            
            // Option 2: Get cases from backend API (recommended)
            const backendUrl = 'https://your-backend-url.com';
            const response = await fetch(`${backendUrl}/api/getAllCases`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch cases: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const cases = data.cases || [];
            
            console.log(`Loaded ${cases.length} cases from API`);
            
            if (cases.length === 0) {
                // Fallback to direct case if API returns no cases
                console.log("No cases found, using fallback case");
                cases.push({ id: 'case1', title: 'Demo Case' });
            }
            
            // Generate the grid of cases
            gridElements.casesGrid.innerHTML = '';
            
            for (const caseItem of cases) {
                await createCaseCard(caseItem);
            }
            
            hideLoading(gridElements.loadingGrid);
        } catch (error) {
            console.error('Error loading cases:', error);
            // Fallback if API fails
            const fallbackCases = [{ id: 'case1', title: 'Demo Case' }];
            gridElements.casesGrid.innerHTML = '';
            for (const caseItem of fallbackCases) {
                await createCaseCard(caseItem);
            }
            hideLoading(gridElements.loadingGrid);
        }
    }
    
    // Function to create a case card for the grid
    async function createCaseCard(caseItem) {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.dataset.caseId = caseItem.id;
        
        console.log(`Creating card for case: ${caseItem.id}, title: ${caseItem.title}`);
        
        // Attempt to get a thumbnail for the case
        // First try to get a real image from the modes directory
        const modesDirectory = `${config.baseUrl}/${caseItem.id}/modes`;
        console.log(`Looking for images in: ${modesDirectory}`);
        
        // Use a placeholder initially
        let thumbnailUrl = `https://via.placeholder.com/300x200?text=${caseItem.id}`;
        
        try {
            // Try to use the first image of T1_SAG as thumbnail
            const potentialThumbnail = `${modesDirectory}/T1_SAG/0001.jpg`;
            const checkImage = new Image();
            await new Promise((resolve) => {
                checkImage.onload = () => {
                    thumbnailUrl = potentialThumbnail;
                    console.log(`Found thumbnail image: ${thumbnailUrl}`);
                    resolve();
                };
                checkImage.onerror = () => {
                    console.log(`Could not load thumbnail image: ${potentialThumbnail}`);
                    resolve();
                };
                checkImage.src = potentialThumbnail;
            });
        } catch (error) {
            console.error(`Error checking for thumbnail: ${error.message}`);
        }
        
        card.innerHTML = `
            <div class="case-image-container">
                <img class="case-image" src="${thumbnailUrl}" alt="${caseItem.title}">
            </div>
            <div class="case-name">${caseItem.title}</div>
        `;
        
        // Add click event to open the case
        card.addEventListener('click', () => {
            console.log(`Opening case: ${caseItem.id}`);
            openCase(caseItem.id);
        });
        
        gridElements.casesGrid.appendChild(card);
    }
    
    // Function to open a case
    async function openCase(caseId) {
        showLoading(caseElements.loadingCase);
        console.log(`Opening case: ${caseId}`);
        
        // Set current case
        config.currentCase = caseId;
        
        // Reset case view state
        config.sequences.allSeries = [];
        config.sequences.currentSeries = null;
        config.sequences.currentImageIndex = 1;
        config.sequences.totalImages = 0;
        config.results.currentImageIndex = 1;
        config.results.totalImages = 0;
        
        caseElements.seriesSelector.innerHTML = '';
        caseElements.sequenceImage.src = '';
        caseElements.resultImage.src = '';
        caseElements.imageSlider.value = 1;
        caseElements.resultSlider.value = 1;
        caseElements.imageSlider.disabled = true;
        caseElements.resultSlider.disabled = true;
        caseElements.prevImageButton.disabled = true;
        caseElements.nextImageButton.disabled = true;
        caseElements.prevResultButton.disabled = true;
        caseElements.nextResultButton.disabled = true;
        
        // Switch to case view
        switchView(gridElements.gridView, caseElements.caseView);
        
        // Load case data
        try {
            let title = `Case ${caseId}`;
            let annotation = 'No annotation available.';
            
            // Backend URL for API calls
            const backendUrl = 'https://your-backend-url.com';
            
            // Fetch title from title.txt
            const titlePath = `radiocases/${caseId}/title.txt`;
            console.log(`Fetching title from: ${titlePath}`);
            try {
                const titleText = await fetchTextFile(titlePath);
                if (titleText) {
                    title = titleText.trim();
                    console.log(`Loaded title: "${title}"`);
                }
            } catch (titleError) {
                console.error("Error fetching title:", titleError);
            }
            
            // Fetch annotation from annotation.txt
            const annotationPath = `radiocases/${caseId}/annotation.txt`;
            console.log(`Fetching annotation from: ${annotationPath}`);
            try {
                const annotationText = await fetchTextFile(annotationPath);
                if (annotationText) {
                    annotation = annotationText.trim();
                    console.log(`Loaded annotation (length: ${annotation.length})`);
                }
            } catch (annotationError) {
                console.error("Error fetching annotation:", annotationError);
            }
            
            // Get available series (folders in the modes directory)
            console.log('Fetching available series from modes directory...');
            
            let seriesResponse;
            try {
                // Try to get series from backend API
                seriesResponse = await fetch(`${backendUrl}/api/getCaseSeries?caseId=${encodeURIComponent(caseId)}`, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                
                if (seriesResponse.ok) {
                    const seriesData = await seriesResponse.json();
                    if (seriesData.series && seriesData.series.length > 0) {
                        config.sequences.allSeries = seriesData.series;
                        console.log(`Loaded series from API: ${config.sequences.allSeries.join(', ')}`);
                    } else {
                        throw new Error('No series returned from API');
                    }
                } else {
                    throw new Error(`API returned status: ${seriesResponse.status}`);
                }
            } catch (seriesError) {
                console.error('Error fetching series from API:', seriesError);
                
                // Fallback: Use common series names as fallback
                console.log('Using fallback series detection');
                const commonSeries = ['T1_SAG', 'T2_SAG', 'FLAIR', 'T1_AX', 'T2_AX', 'DWI', 'ADC', 
                                     'T1', 'T2', 'PD', 'STIR', 'SWI', 'TOF', 'CISS', 'FIESTA', 'DESS'];
                
                // In a real implementation, you would probe for images here
                // For this example, we'll use default fallbacks
                config.sequences.allSeries = ['T1_SAG', 'T2_SAG'];
            }
            
            // Update case title
            caseElements.caseTitle.textContent = title;
            
            // Update annotation
            caseElements.caseAnnotation.textContent = annotation || 'No annotation available.';
            
            // Populate series selector
            caseElements.seriesSelector.innerHTML = '';
            config.sequences.allSeries.forEach(series => {
                const option = document.createElement('option');
                option.value = series;
                option.textContent = series.replace('_', ' ');
                caseElements.seriesSelector.appendChild(option);
            });
            
            // Set initial series
            if (config.sequences.allSeries.length > 0) {
                config.sequences.currentSeries = config.sequences.allSeries[0];
                caseElements.seriesSelector.value = config.sequences.currentSeries;
                console.log(`Selected initial series: ${config.sequences.currentSeries}`);
                
                // Load images for the initial series
                await loadSeriesImages();
            }
            
            // Initialize to Part 1: Sequences
            switchCasePart(1);
            
            hideLoading(caseElements.loadingCase);
        } catch (error) {
            console.error('Error loading case:', error);
            caseElements.caseTitle.textContent = `Error loading case ${caseId}`;
            hideLoading(caseElements.loadingCase);
        }
    }
    
    // Function to get image URL for a sequence
    function getSequenceImageUrl(index) {
        // Format the index with leading zeros (0001, 0002, etc.)
        let indexStr = String(index);
        while (indexStr.length < 4) {
            indexStr = '0' + indexStr;
        }
        
        // The path to the image in VK Cloud Storage
        const imagePath = `radiocases/${config.currentCase}/modes/${config.sequences.currentSeries}/${indexStr}.jpg`;
        
        // Option 1: Direct URL if bucket is public
        // return `${config.baseUrl}/${imagePath}`;
        
        // Option 2: Using backend for signed URLs (recommended)
        const backendUrl = 'https://your-backend-url.com';
        return `${backendUrl}/api/getSignedUrl?key=${encodeURIComponent(imagePath)}`;
    }
    
    // Function to get image URL for a result
    function getResultImageUrl(index) {
        // Format the index with leading zeros (0001, 0002, etc.)
        let indexStr = String(index);
        while (indexStr.length < 4) {
            indexStr = '0' + indexStr;
        }
        
        // The path to the result image in VK Cloud Storage
        const imagePath = `radiocases/${config.currentCase}/result/${indexStr}.jpg`;
        
        // Option 1: Direct URL if bucket is public
        // return `${config.baseUrl}/${imagePath}`;
        
        // Option 2: Using backend for signed URLs (recommended)
        const backendUrl = 'https://your-backend-url.com';
        return `${backendUrl}/api/getSignedUrl?key=${encodeURIComponent(imagePath)}`;
    }
    
    // Function to get text URL for a result
    function getResultTextUrl(index) {
        // Format the index with leading zeros (0001, 0002, etc.)
        let indexStr = String(index);
        while (indexStr.length < 4) {
            indexStr = '0' + indexStr;
        }
        
        // For text files, we'll use the path directly
        return `radiocases/${config.currentCase}/result/${indexStr}.txt`;
    }
    
    // Function to load images for the current series
    async function loadSeriesImages() {
        showLoading(caseElements.loadingCase);
        console.log(`Loading images for series: ${config.sequences.currentSeries}`);
        
        // Disable UI controls while loading
        caseElements.imageSlider.disabled = true;
        caseElements.prevImageButton.disabled = true;
        caseElements.nextImageButton.disabled = true;
        caseElements.sequenceImage.src = '';
        
        // Detect the number of images in this series
        try {
            // Probe for images until one fails to load
            const imageBasePath = `${config.baseUrl}/${config.currentCase}/modes/${config.sequences.currentSeries}`;
            console.log(`Probing for images in: ${imageBasePath}`);
            
            let totalImages = 0;
            let index = 1;
            const maxAttempts = 30; // Limit to prevent infinite loops
            
            while (index <= maxAttempts) {
                // Format index with leading zeros
                let indexStr = String(index);
                while (indexStr.length < 4) {
                    indexStr = '0' + indexStr;
                }
                
                const imageUrl = `${imageBasePath}/${indexStr}.jpg`;
                console.log(`Checking image: ${imageUrl}`);
                
                try {
                    const exists = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(true);
                        img.onerror = () => resolve(false);
                        img.src = imageUrl;
                    });
                    
                    if (exists) {
                        totalImages = index;
                        console.log(`Image ${index} exists`);
                        index++;
                    } else {
                        console.log(`Image ${index} does not exist, stopping probe`);
                        break;
                    }
                } catch (error) {
                    console.error(`Error checking image ${index}:`, error);
                    break;
                }
            }
            
            console.log(`Total images found: ${totalImages}`);
            
            if (totalImages > 0) {
                config.sequences.totalImages = totalImages;
                caseElements.imageSlider.min = 1;
                caseElements.imageSlider.max = totalImages;
                caseElements.imageSlider.disabled = false;
                
                // Load the first image
                loadSequenceImage(1);
            } else {
                console.log('No images found in this series');
                caseElements.imageInfo.textContent = 'No images found';
                hideLoading(caseElements.loadingCase);
            }
        } catch (error) {
            console.error('Error loading series images:', error);
            caseElements.imageInfo.textContent = 'Error loading images';
            hideLoading(caseElements.loadingCase);
        }
    }
    
    // Function to load images for results
    async function loadResultImages() {
        showLoading(caseElements.loadingCase);
        console.log('Loading result images');
        
        // Disable UI controls while loading
        caseElements.resultSlider.disabled = true;
        caseElements.prevResultButton.disabled = true;
        caseElements.nextResultButton.disabled = true;
        caseElements.resultImage.src = '';
        
        // Probe for result images
        try {
            const resultBasePath = `${config.baseUrl}/${config.currentCase}/result`;
            console.log(`Probing for result images in: ${resultBasePath}`);
            
            let totalImages = 0;
            let index = 1;
            const maxAttempts = 30; // Limit to prevent infinite loops
            
            while (index <= maxAttempts) {
                // Format index with leading zeros
                let indexStr = String(index);
                while (indexStr.length < 4) {
                    indexStr = '0' + indexStr;
                }
                
                const imageUrl = `${resultBasePath}/${indexStr}.jpg`;
                console.log(`Checking result image: ${imageUrl}`);
                
                try {
                    const exists = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(true);
                        img.onerror = () => resolve(false);
                        img.src = imageUrl;
                    });
                    
                    if (exists) {
                        totalImages = index;
                        console.log(`Result image ${index} exists`);
                        index++;
                    } else {
                        console.log(`Result image ${index} does not exist, stopping probe`);
                        break;
                    }
                } catch (error) {
                    console.error(`Error checking result image ${index}:`, error);
                    break;
                }
            }
            
            console.log(`Total result images found: ${totalImages}`);
            
            if (totalImages > 0) {
                config.results.totalImages = totalImages;
                caseElements.resultSlider.min = 1;
                caseElements.resultSlider.max = totalImages;
                caseElements.resultSlider.disabled = false;
                
                // Load the first result
                loadResultImage(1);
            } else {
                console.log('No result images found');
                caseElements.resultInfo.textContent = 'No results found';
                hideLoading(caseElements.loadingCase);
            }
        } catch (error) {
            console.error('Error loading result images:', error);
            caseElements.resultInfo.textContent = 'Error loading results';
            hideLoading(caseElements.loadingCase);
        }
    }
    
    // Function to probe for images until one fails to load
    async function probeForImages(urlGeneratorFunc) {
        return new Promise((resolve) => {
            let count = 0;
            let index = 1;
            const maxAttempts = 100; // Limit the number of attempts
            
            function checkImage(idx) {
                if (idx > maxAttempts) {
                    resolve(count);
                    return;
                }
                
                const img = new Image();
                
                img.onload = function() {
                    count = idx;
                    checkImage(idx + 1);
                };
                
                img.onerror = function() {
                    resolve(count);
                };
                
                img.src = urlGeneratorFunc(idx);
            }
            
            checkImage(index);
        });
    }
    
    // Function to load a sequence image
    async function loadSequenceImage(index) {
        // Show loading spinner
        showLoading(caseElements.loadingCase);
        console.log(`Loading sequence image ${index} from series ${config.sequences.currentSeries}`);
        
        // Update interface
        config.sequences.currentImageIndex = index;
        caseElements.imageSlider.value = index;
        caseElements.imageInfo.textContent = `Image: ${index} / ${config.sequences.totalImages}`;
        caseElements.seriesInfo.textContent = `Series: ${config.sequences.currentSeries}`;
        
        // Enable/disable navigation buttons
        caseElements.prevImageButton.disabled = index <= 1;
        caseElements.nextImageButton.disabled = index >= config.sequences.totalImages;
        
        try {
            // Get the image URL (either direct or signed URL)
            const imageUrlOrPath = getSequenceImageUrl(index);
            console.log(`Image URL/Path: ${imageUrlOrPath}`);
            
            let finalImageUrl;
            
            // If we're getting a signed URL from the backend
            if (imageUrlOrPath.includes('/api/getSignedUrl')) {
                const response = await fetch(imageUrlOrPath);
                if (!response.ok) {
                    throw new Error(`Failed to get signed URL: ${response.status}`);
                }
                const data = await response.json();
                finalImageUrl = data.url;
                console.log(`Received signed URL: ${finalImageUrl.substring(0, 100)}...`);
            } else {
                // Direct URL case
                finalImageUrl = imageUrlOrPath;
            }
            
            // Create a new image object to check if the image exists
            const img = new Image();
            img.crossOrigin = "Anonymous";  // Try to handle CORS issues
            
            img.onload = function() {
                console.log(`✓ Successfully loaded image ${index}`);
                // Set the src only after the image has loaded to avoid flashing
                caseElements.sequenceImage.src = this.src;
                hideLoading(caseElements.loadingCase);
                vibrate(); // Vibrate when image is loaded
            };
            
            img.onerror = function() {
                console.error(`✗ Failed to load image at index ${index}`);
                caseElements.sequenceImage.src = `https://via.placeholder.com/512x512?text=Error+Loading+Image`;
                hideLoading(caseElements.loadingCase);
            };
            
            img.src = finalImageUrl;
        } catch (error) {
            console.error(`Error loading image: ${error.message}`);
            caseElements.sequenceImage.src = `https://via.placeholder.com/512x512?text=Error+Loading+Image`;
            hideLoading(caseElements.loadingCase);
        }
    }
    
    // Function to load a result image and its text
    async function loadResultImage(index) {
        // Show loading spinner
        showLoading(caseElements.loadingCase);
        console.log(`Loading result image ${index}`);
        
        // Update interface
        config.results.currentImageIndex = index;
        caseElements.resultSlider.value = index;
        caseElements.resultInfo.textContent = `Result: ${index} / ${config.results.totalImages}`;
        
        // Enable/disable navigation buttons
        caseElements.prevResultButton.disabled = index <= 1;
        caseElements.nextResultButton.disabled = index >= config.results.totalImages;
        
        try {
            // Get the image URL (either direct or signed URL)
            const imageUrlOrPath = getResultImageUrl(index);
            console.log(`Result image URL/Path: ${imageUrlOrPath}`);
            
            let finalImageUrl;
            
            // If we're getting a signed URL from the backend
            if (imageUrlOrPath.includes('/api/getSignedUrl')) {
                const response = await fetch(imageUrlOrPath);
                if (!response.ok) {
                    throw new Error(`Failed to get signed URL: ${response.status}`);
                }
                const data = await response.json();
                finalImageUrl = data.url;
                console.log(`Received signed URL: ${finalImageUrl.substring(0, 100)}...`);
            } else {
                // Direct URL case
                finalImageUrl = imageUrlOrPath;
            }
            
            // Load the image
            const img = new Image();
            img.crossOrigin = "Anonymous";  // Try to handle CORS issues
            
            img.onload = function() {
                console.log(`✓ Successfully loaded result image ${index}`);
                caseElements.resultImage.src = this.src;
                hideLoading(caseElements.loadingCase);
                vibrate(); // Vibrate when image is loaded
            };
            
            img.onerror = function() {
                console.error(`✗ Failed to load result image at index ${index}`);
                caseElements.resultImage.src = `https://via.placeholder.com/512x512?text=Error+Loading+Image`;
                hideLoading(caseElements.loadingCase);
            };
            
            img.src = finalImageUrl;
            
            // Load the text
            try {
                const textPath = getResultTextUrl(index);
                console.log(`Loading result text from: ${textPath}`);
                const textContent = await fetchTextFile(textPath);
                
                if (textContent && textContent.trim().length > 0) {
                    console.log(`✓ Result text loaded (length: ${textContent.length})`);
                    caseElements.resultText.textContent = textContent.trim();
                } else {
                    console.log('✗ No result text found or text was empty');
                    caseElements.resultText.textContent = 'No description available for this result.';
                }
            } catch (error) {
                console.error(`✗ Failed to load result text at index ${index}:`, error);
                caseElements.resultText.textContent = 'Error loading description.';
            }
        } catch (error) {
            console.error(`Error loading result image: ${error.message}`);
            caseElements.resultImage.src = `https://via.placeholder.com/512x512?text=Error+Loading+Image`;
            hideLoading(caseElements.loadingCase);
        }
    }
    
    // Set up event listeners
    
    // Grid view events
    
    // Case view events
    caseElements.backButton.addEventListener('click', () => {
        switchView(caseElements.caseView, gridElements.gridView);
    });
    
    // Part navigation
    caseElements.prevPartButton.addEventListener('click', () => {
        switchCasePart(1); // Switch to sequences
    });
    
    caseElements.nextPartButton.addEventListener('click', () => {
        switchCasePart(2); // Switch to results
    });
    
    // Sequence navigation
    caseElements.seriesSelector.addEventListener('change', () => {
        config.sequences.currentSeries = caseElements.seriesSelector.value;
        loadSeriesImages();
    });
    
    caseElements.prevImageButton.addEventListener('click', () => {
        if (config.sequences.currentImageIndex > 1) {
            loadSequenceImage(config.sequences.currentImageIndex - 1);
        }
    });
    
    caseElements.nextImageButton.addEventListener('click', () => {
        if (config.sequences.currentImageIndex < config.sequences.totalImages) {
            loadSequenceImage(config.sequences.currentImageIndex + 1);
        }
    });
    
    caseElements.imageSlider.addEventListener('input', () => {
        loadSequenceImage(parseInt(caseElements.imageSlider.value));
    });
    
    // Result navigation
    caseElements.prevResultButton.addEventListener('click', () => {
        if (config.results.currentImageIndex > 1) {
            loadResultImage(config.results.currentImageIndex - 1);
        }
    });
    
    caseElements.nextResultButton.addEventListener('click', () => {
        if (config.results.currentImageIndex < config.results.totalImages) {
            loadResultImage(config.results.currentImageIndex + 1);
        }
    });
    
    caseElements.resultSlider.addEventListener('input', () => {
        loadResultImage(parseInt(caseElements.resultSlider.value));
    });
    
    // Vibration mode
    caseElements.vibrationMode.addEventListener('change', () => {
        config.vibrationMode = caseElements.vibrationMode.value;
        
        // Test vibration
        if (config.vibrationMode !== 'none') {
            vibrate();
        }
    });
    
    // Check for vibration support
    if (!isVibrationSupported()) {
        caseElements.vibrationMode.disabled = true;
        const label = document.querySelector('label[for="vibration-mode"]');
        if (label) {
            label.textContent += ' (Not Supported)';
        }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (caseElements.caseView.classList.contains('hidden')) {
            return; // Only handle keyboard navigation in case view
        }
        
        if (config.currentPart === 1) {
            // Sequences part
            if (e.key === 'ArrowLeft' && !caseElements.prevImageButton.disabled) {
                loadSequenceImage(config.sequences.currentImageIndex - 1);
            } else if (e.key === 'ArrowRight' && !caseElements.nextImageButton.disabled) {
                loadSequenceImage(config.sequences.currentImageIndex + 1);
            }
        } else {
            // Results part
            if (e.key === 'ArrowLeft' && !caseElements.prevResultButton.disabled) {
                loadResultImage(config.results.currentImageIndex - 1);
            } else if (e.key === 'ArrowRight' && !caseElements.nextResultButton.disabled) {
                loadResultImage(config.results.currentImageIndex + 1);
            }
        }
    });
    
    // Local testing helper for simulating the structure
    function setupLocalTestingData() {
        if (isLocalDevelopment) {
            console.log('Setting up local testing data');
            
            // Load all cases
            loadAllCases();
        }
    }
    
    // Initialize the app
    setupLocalTestingData();
    
    // If not in development mode, load cases from the server
    if (!isLocalDevelopment) {
        loadAllCases();
    }
});
// Initialize VK Mini App
document.addEventListener('DOMContentLoaded', function() {
    // Initialize VK Mini App
    vkBridge.send('VKWebAppInit');
    
    // Check if we're running locally
    const isLocalDevelopment = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1';
    
    // Base configuration
    const config = {
        // Use local test data if in development mode
        baseUrl: isLocalDevelopment ? './test-data' : 'https://storage.yandexcloud.net/radiocases/Cases1',
        series: 'T1_SAG',
        currentImageIndex: 1,
        totalImages: 0,
        imageFormat: 'jpg',
        imagePrefix: '000',
        vibrationMode: 'none',
        vibrationPatterns: {
            none: [],
            light: [50],
            medium: [100, 50, 100],
            strong: [200, 100, 200, 100, 200]
        }
    };
    
    // DOM Elements
    const elements = {
        medicalImage: document.getElementById('medical-image'),
        imageSlider: document.getElementById('image-slider'),
        prevButton: document.getElementById('prev-button'),
        nextButton: document.getElementById('next-button'),
        seriesSelector: document.getElementById('series-selector'),
        vibrationMode: document.getElementById('vibration-mode'),
        imageInfo: document.getElementById('image-info'),
        seriesInfo: document.getElementById('series-info'),
        loading: document.getElementById('loading')
    };
    
    // Function to check if Vibration API is supported
    function isVibrationSupported() {
        return 'vibrate' in navigator;
    }
    
    // Function to vibrate based on selected mode
    function vibrate() {
        if (isVibrationSupported() && config.vibrationMode !== 'none') {
            navigator.vibrate(config.vibrationPatterns[config.vibrationMode]);
        }
    }
    
    // Function to construct image URL
    function getImageUrl(index) {
        // Format the index with leading zeros (0001, 0002, etc.)
        let indexStr = String(index);
        while (indexStr.length < 4) {
            indexStr = '0' + indexStr;
        }
        
        return `${config.baseUrl}/${config.series}/${indexStr}.${config.imageFormat}`;
    }
    
    // Function to load image
    function loadImage(index) {
        // Show loading spinner
        elements.loading.classList.remove('hidden');
        
        // Update interface
        config.currentImageIndex = index;
        elements.imageSlider.value = index;
        elements.imageInfo.textContent = `Image: ${index} / ${config.totalImages}`;
        elements.seriesInfo.textContent = `Series: ${config.series}`;
        
        // Enable/disable navigation buttons
        elements.prevButton.disabled = index <= 1;
        elements.nextButton.disabled = index >= config.totalImages;
        
        // Create a new image object to check if the image exists
        const img = new Image();
        img.onload = function() {
            elements.medicalImage.src = this.src;
            elements.loading.classList.add('hidden');
            vibrate(); // Vibrate when image is loaded
        };
        
        img.onerror = function() {
            console.error(`Failed to load image at index ${index}`);
            elements.loading.classList.add('hidden');
            
            // If the first image fails, try next image
            if (index === 1 && config.totalImages > 1) {
                loadImage(2);
            }
        };
        
        img.src = getImageUrl(index);
    }
    
    // Function to detect total number of images in the series
    function detectTotalImages() {
        // Reset UI
        elements.imageSlider.disabled = true;
        elements.prevButton.disabled = true;
        elements.nextButton.disabled = true;
        elements.loading.classList.remove('hidden');
        elements.medicalImage.src = '';
        
        // Start with a reasonable maximum estimate and binary search
        // For simplicity in this example, we'll use a probing approach
        const probeImage = (index, maxAttempts = 5, currentAttempt = 0) => {
            if (currentAttempt >= maxAttempts) {
                finishDetection(index - 1);
                return;
            }
            
            const img = new Image();
            img.onload = function() {
                // This image exists, try a higher index
                probeImage(index + 10, maxAttempts, currentAttempt);
            };
            
            img.onerror = function() {
                // This image doesn't exist, try a more precise search
                if (index <= 1) {
                    finishDetection(0);
                    return;
                }
                
                // Binary search for the exact end
                const binarySearch = (low, high) => {
                    if (low > high) {
                        finishDetection(low - 1);
                        return;
                    }
                    
                    const mid = Math.floor((low + high) / 2);
                    const testImg = new Image();
                    
                    testImg.onload = function() {
                        binarySearch(mid + 1, high);
                    };
                    
                    testImg.onerror = function() {
                        binarySearch(low, mid - 1);
                    };
                    
                    testImg.src = getImageUrl(mid);
                };
                
                binarySearch(index - 10, index - 1);
            };
            
            img.src = getImageUrl(index);
        };
        
        const finishDetection = (total) => {
            config.totalImages = total;
            
            if (total > 0) {
                elements.imageSlider.min = 1;
                elements.imageSlider.max = total;
                elements.imageSlider.disabled = false;
                loadImage(1);
            } else {
                elements.imageInfo.textContent = 'No images found';
                elements.loading.classList.add('hidden');
            }
        };
        
        // Start probing
        probeImage(1);
    }
    
    // Set up event listeners
    elements.prevButton.addEventListener('click', () => {
        if (config.currentImageIndex > 1) {
            loadImage(config.currentImageIndex - 1);
        }
    });
    
    elements.nextButton.addEventListener('click', () => {
        if (config.currentImageIndex < config.totalImages) {
            loadImage(config.currentImageIndex + 1);
        }
    });
    
    elements.imageSlider.addEventListener('input', () => {
        loadImage(parseInt(elements.imageSlider.value));
    });
    
    elements.seriesSelector.addEventListener('change', () => {
        config.series = elements.seriesSelector.value;
        detectTotalImages();
    });
    
    elements.vibrationMode.addEventListener('change', () => {
        config.vibrationMode = elements.vibrationMode.value;
        
        // Test vibration
        if (config.vibrationMode !== 'none') {
            vibrate();
        }
    });
    
    // Initialize with the default series
    detectTotalImages();
    
    // Check for vibration support
    if (!isVibrationSupported()) {
        elements.vibrationMode.disabled = true;
        document.querySelector('label[for="vibration-mode"]').textContent += ' (Not Supported)';
    }
    
    // Function to handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && !elements.prevButton.disabled) {
            loadImage(config.currentImageIndex - 1);
        } else if (e.key === 'ArrowRight' && !elements.nextButton.disabled) {
            loadImage(config.currentImageIndex + 1);
        }
    });
});