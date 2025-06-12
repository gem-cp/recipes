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
                "docs/chutneys.md",
                "docs/gebratener-eierreis.md",
                "docs/palak-paneer.md"
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

            let imageUrl = '/images/banner.png';
            const imageMatch = markdown.match(/!\[.*?\]\((.*?)\)/);
            if (imageMatch && imageMatch[1]) {
                imageUrl = imageMatch[1];
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
            let resolvedHref = href;
            if (href && !href.startsWith('http://') && !href.startsWith('https://')) {
                // This is a local path, let's ensure it's correct from the root
                if (href.startsWith('/images/')) {
                    // Path is already correctly absolute from root (e.g., /images/foo.png)
                    resolvedHref = href;
                } else if (href.startsWith('images/')) {
                    // Path is relative like images/foo.png, make it absolute from root
                    resolvedHref = '/' + href;
                } else {
                    // Path is just a filename like foo.png, assume it's in /images/
                    // or it could be an invalid path from markdown.
                    // For safety, prepend /images/ if it doesn't look like a directory path.
                    if (href.includes('/')) { // it's some other relative path e.g. ../images/foo.png - this case is tricky for a general solution without knowing the base
                        // For now, assume such paths are not used based on current project structure.
                        // If they were, a more complex path resolution logic would be needed.
                        // Given current structure, we mostly expect /images/ or just filename.
                        resolvedHref = href; // Or potentially try to resolve, but let's stick to simpler cases.
                    } else { // Just a filename like "palak-paneer.png"
                        resolvedHref = '/images/' + href;
                    }
                }
            }
            // Use the original renderer logic with the potentially modified href
            // This ensures title and alt text are handled as default.
            // Note: The default renderer.image is:
            // Renderer.prototype.image = function(href, title, text) {
            //   href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
            //   if (href === null) {
            //     return text;
            //   }
            //   var out = '<img src="' + href + '" alt="' + text + '"';
            //   if (title) {
            //     out += ' title="' + title + '"';
            //   }
            //   out += this.options.xhtml ? '/>' : '>';
            //   return out;
            // };
            // We will reconstruct this:
            if (resolvedHref === null) {
                return text; // Alt text
            }
            let out = '<img src="' + resolvedHref + '" alt="' + text + '"';
            if (title) {
                out += ' title="' + title + '"';
            }
            out += '>'; // Simpler, no xhtml option needed here for this project
            return out;
        };

        try {
            // Use the custom renderer with marked
            recipeContentElement.innerHTML = marked.parse(recipe.markdown, { renderer: renderer });
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
