document.addEventListener('DOMContentLoaded', () => {
    const recipeListElement = document.getElementById('recipe-list'); // This is the swiper-wrapper
    const recipeDetailElement = document.getElementById('recipe-detail');
    const recipeContentElement = document.getElementById('recipe-content');
    const closeRecipeBtn = document.getElementById('close-recipe-btn');
    const searchBar = document.getElementById('search-bar');

    let allRecipes = []; // To store all fetched recipe data
    let swiperInstance = null; // Swiper instance

    async function loadRecipes() {
        try {
            // Hardcoded list of recipe file paths
            const recipeFilePaths = [
                "recipes/chutneys.md",
                "recipes/gebratener-eierreis.md",
                "recipes/palak-paneer.md"
            ];

            if (recipeFilePaths.length === 0) {
                recipeListElement.innerHTML = '<p>Keine Rezepte definiert.</p>';
                if(swiperInstance) swiperInstance.destroy(true, true);
                swiperInstance = null;
                return;
            }

            // The fetchRecipeDetails function expects a path and a defaultName.
            // We can derive a defaultName from the path.
            const recipePromises = recipeFilePaths.map(path => {
                const fileName = path.split('/').pop().replace('.md', '');
                const defaultName = fileName.replace(/-/g, ' ').replace(/_/g, ' '); // Simple name from filename
                return fetchRecipeDetails(path, defaultName);
            });

            allRecipes = await Promise.all(recipePromises);

            // Filter out any null results from failed fetches
            allRecipes = allRecipes.filter(recipe => recipe !== null);

            displayRecipes(allRecipes);

        } catch (error) {
            console.error('Error loading recipes:', error);
            recipeListElement.innerHTML = '<p>Fehler beim Laden der Rezepte. Details siehe Konsole.</p>';
            if(swiperInstance) swiperInstance.destroy(true, true); // Also destroy swiper on general error
            swiperInstance = null;
        }
    }

    async function fetchRecipeDetails(markdownPath, defaultName) {
        try {
            const response = await fetch(markdownPath);
            if (!response.ok) {
                console.warn(`Failed to fetch ${markdownPath}: ${response.statusText}`);
                return null;
            }
            const markdown = await response.text();

            let title = defaultName;
            const titleMatch = markdown.match(/^#\s*(.*)/m);
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1];
            }

            let imageUrl = '/images/banner.png'; // Default image for cards if no image found in MD
            const imageMatch = markdown.match(/!\[.*?\]\((.*?)\)/); // Find first markdown image

            if (imageMatch && typeof imageMatch[1] === 'string') {
                let extractedPath = imageMatch[1];

                // Normalize the extracted path
                if (!extractedPath.startsWith('http://') && !extractedPath.startsWith('https://')) {
                    if (extractedPath.startsWith('/images/')) {
                        // Already correct, e.g., /images/foo.png
                        imageUrl = extractedPath;
                    } else if (extractedPath.startsWith('images/')) {
                        // Relative to something, make it /images/foo.png
                        imageUrl = '/' + extractedPath;
                    } else if (!extractedPath.includes('/')) {
                        // Just a filename like foo.png, assume it's in /images/
                        imageUrl = '/images/' + extractedPath;
                    } else {
                        // Some other relative path like ../images/foo.png or similar.
                        // For this project, we'll assume this isn't standard and default.
                        // Or, if it's a valid relative path from root that's not /images, it might be kept.
                        // However, given the 404s (e.g. "chutneys.png"), explicitly targeting /images is safer.
                        // If an image is truly at the root, e.g. /foo.png, and markdown is ![...](/foo.png),
                        // then this logic needs to be smarter. For now, assume all recipe images are in /images/.
                        // If it contains slashes but doesn't fit above, it might be an error or an unsupported path.
                        // To be safe, if it's not one of the common patterns, we could log a warning
                        // and keep it, or revert to default. Let's try to be a bit more direct for this project.
                        // The key is to fix paths like "chutneys.png" becoming "/images/chutneys.png".
                        imageUrl = '/images/' + extractedPath.split('/').pop(); // take the filename part and put it in /images/
                    }
                } else {
                    // It's an external URL, use as is
                    imageUrl = extractedPath;
                }
            }

            return {
                id: markdownPath,
                title: title,
                image: imageUrl,
                markdown: markdown,
                path: markdownPath
            };
        } catch (error) {
            console.error(`Error fetching or parsing ${markdownPath}:`, error);
            return null;
        }
    }

    function initializeSwiper() {
        if (swiperInstance) {
            swiperInstance.destroy(true, true);
            swiperInstance = null;
        }

        const recipeCards = document.querySelectorAll('#recipe-list .recipe-card');

        if (recipeCards.length > 0) {
            swiperInstance = new Swiper('#recipe-swiper', {
                slidesPerView: 1,
                spaceBetween: 10,
                breakpoints: {
                    640: {
                        slidesPerView: 2,
                        spaceBetween: 20
                    },
                    768: {
                        slidesPerView: 3,
                        spaceBetween: 30
                    },
                    1024: {
                        slidesPerView: 4, // Or 3 if 4 feels too cramped with coverflow
                        spaceBetween: 30, // Adjust space for coverflow
                        effect: 'coverflow',
                        coverflowEffect: {
                            rotate: 30,
                            stretch: 0, // Can be 0 for no stretch
                            depth: 100,
                            modifier: 1, // Lower for less pronounced effect, higher for more
                            slideShadows: true
                        },
                    }
                },
                // loop: recipeCards.length > 3, // Loop can be tricky with dynamic content changes
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                grabCursor: true,
                // autoHeight: true, // Consider if card heights are very different
            });
        }
    }

    function displayRecipes(recipes) {
        recipeListElement.innerHTML = '';

        if (recipes.length === 0) {
            recipeListElement.innerHTML = '<p>Keine Rezepte gefunden.</p>';
            if(swiperInstance) {
                swiperInstance.destroy(true, true);
                swiperInstance = null;
            }
            return;
        }

        recipes.forEach(recipe => {
            const card = document.createElement('article');
            card.className = 'recipe-card swiper-slide';
            card.innerHTML = `
                <img src="${recipe.image}" alt="${recipe.title}">
                <h3>${recipe.title}</h3>
            `;
            card.addEventListener('click', () => showRecipeDetail(recipe));
            recipeListElement.appendChild(card);
        });

        initializeSwiper();
    }

    function showRecipeDetail(recipe) {
        const renderer = new marked.Renderer();
        // const originalImageRenderer = renderer.image; // Keep a reference to the original if needed, or override directly

        renderer.image = (href, title, text) => {
            // Add this check at the beginning:
            if (typeof href !== 'string') {
                return text; // Return alt text if href is not a string (e.g., null or undefined from ![]())
            }

            let resolvedHref = href;
            // Now it's safe to call startsWith and other string methods on href
            if (!href.startsWith('http://') && !href.startsWith('https://')) {
                if (href.startsWith('/images/')) {
                    resolvedHref = href;
                } else if (href.startsWith('images/')) {
                    resolvedHref = '/' + href;
                } else {
                    if (href.includes('/')) {
                        resolvedHref = href;
                    } else {
                        resolvedHref = '/images/' + href;
                    }
                }
            }

            if (resolvedHref === null) { // Should not happen if typeof href !== 'string' is caught
                return text;
            }
            let out = '<img src="' + resolvedHref + '" alt="' + text + '"';
            if (title) {
                out += ' title="' + title + '"';
            }
            out += '>';
            return out;
        };

        try {
            recipeContentElement.innerHTML = marked.parse(recipe.markdown);
        } catch (e) {
            console.error('Error parsing Markdown:', e);
            recipeContentElement.innerHTML = '<p>Fehler beim Anzeigen des Rezepts. Der Inhalt konnte nicht korrekt umgewandelt werden.</p>';
        }
        recipeDetailElement.classList.remove('hidden');
        recipeDetailElement.scrollTop = 0;
    }

    closeRecipeBtn.addEventListener('click', () => {
        recipeDetailElement.classList.add('hidden');
        recipeContentElement.innerHTML = '';
    });

    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredRecipes = allRecipes.filter(recipe => {
            return recipe.title.toLowerCase().includes(searchTerm) ||
                   recipe.markdown.toLowerCase().includes(searchTerm);
        });
        displayRecipes(filteredRecipes);
    });

    loadRecipes();
});
