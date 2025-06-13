---
layout: default
---

![Banner]({{ site.baseurl }}/banner.png)

<div id="recipes-container">
  <!-- Recipes will be loaded here by JavaScript -->
</div>

<script>
  // This passes the site's base URL from Jekyll to our JavaScript
  const site_baseurl = '{{ site.baseurl }}';
</script>
<script src="{{ site.baseurl }}/script.js"></script>