document.addEventListener('DOMContentLoaded', function() {
    // The 'site_baseurl' variable is defined in index.md
    const fetchUrl = `${site_baseurl}/recipes.json`;

    fetch(fetchUrl)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('recipes-container');
            if (!container) return;

            let allCardsHTML = '';
            data.recipes.forEach(recipe => {
                // The URLs in the JSON are now complete and correct
                const recipeCard = `
                    <div class="recipe-card">
                        <a href="${recipe.url}">
                            <img src="${recipe.image}" alt="${recipe.name}">
                            <h3>${recipe.name}</h3>
                        </a>
                        <p>${recipe.description}</p>
                    </div>
                `;
                allCardsHTML += recipeCard;
            });
            container.innerHTML = allCardsHTML;
        })
        .catch(error => {
            console.error('Error fetching or processing recipes:', error);
            const container = document.getElementById('recipes-container');
            if(container) container.innerHTML = "<p>Could not load recipes.</p>";
        });
});