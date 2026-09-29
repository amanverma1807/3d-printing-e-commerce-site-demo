(function() {
  const track = document.querySelector('.carousel-track');
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  
  let currentIndex = 0;
  let autoplayInterval;
  const autoplayDelay = 2500;
  
  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    
    currentIndex = index;
  }
  
  function nextSlide() {
    const next = (currentIndex + 1) % slides.length;
    showSlide(next);
  }
  
  function prevSlide() {
    const prev = (currentIndex - 1 + slides.length) % slides.length;
    showSlide(prev);
  }
  
  function startAutoplay() {
    clearInterval(autoplayInterval);
    autoplayInterval = setInterval(nextSlide, autoplayDelay);
  }
  
  function resetAutoplay() {
    startAutoplay();
  }
  
  showSlide(0);
  startAutoplay();
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetAutoplay();
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetAutoplay();
    });
  }
  
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      resetAutoplay();
    });
  });
  
  const container = document.querySelector('.hero-carousel-container');
  if (container) {
    container.addEventListener('mouseenter', () => {
      clearInterval(autoplayInterval);
    });
    container.addEventListener('mouseleave', () => {
      startAutoplay();
    });
  }
})();
