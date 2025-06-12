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
            const readmeResponse = await fetch('README.md');
            if (!readmeResponse.ok) {
                throw new Error(`Failed to fetch README.md: ${readmeResponse.statusText}`);
            }
            const readmeContent = await readmeResponse.text();
            const recipeLinks = parseReadmeForRecipeLinks(readmeContent);

            if (recipeLinks.length === 0) {
                recipeListElement.innerHTML = '<p>Keine Rezepte im README gefunden.</p>';
                // Ensure swiper is cleared if it was somehow initialized before recipes loaded
                if(swiperInstance) swiperInstance.destroy(true, true);
                swiperInstance = null;
                return;
            }

            const recipePromises = recipeLinks.map(link => fetchRecipeDetails(link.path, link.name));
            allRecipes = await Promise.all(recipePromises);

            allRecipes = allRecipes.filter(recipe => recipe !== null);

            displayRecipes(allRecipes);

        } catch (error) {
            console.error('Error loading recipes:', error);
            recipeListElement.innerHTML = '<p>Fehler beim Laden der Rezepte. Details siehe Konsole.</p>';
            if(swiperInstance) swiperInstance.destroy(true, true);
            swiperInstance = null;
        }
    }

    function parseReadmeForRecipeLinks(readmeContent) {
        const links = [];
        const regex = /- \[(.*?)\]\((docs\/.*?\.md)\)/g;
        let match;
        while ((match = regex.exec(readmeContent)) !== null) {
            links.push({ name: match[1], path: match[2] });
        }
        if (links.length === 0) {
            const simpleRegex = /\((docs\/[^)]+\.md)\)/g;
            while ((match = simpleRegex.exec(readmeContent)) !== null) {
                const fileName = match[1].split('/').pop().replace('.md', '');
                const displayName = fileName.replace(/-/g, ' ').replace(/_/g, ' ');
                links.push({ name: displayName, path: match[1] });
            }
        }
        return links;
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
