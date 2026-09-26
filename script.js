document.addEventListener('DOMContentLoaded', () => {
    // Scroll reveal animation
    const reveals = document.querySelectorAll('.reveal');

    function revealOnScroll() {
        const windowHeight = window.innerHeight;
        const elementVisible = 100;

        reveals.forEach((reveal) => {
            const elementTop = reveal.getBoundingClientRect().top;
            if (elementTop < windowHeight - elementVisible) {
                reveal.classList.add('active');
            }
        });
    }

    // Trigger once on load
    revealOnScroll();

    // Add scroll event listener
    window.addEventListener('scroll', revealOnScroll);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Mockup interactivity simulation (optional micro-animations)
    const taskItems = document.querySelectorAll('.widget.task-widget li');
    taskItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateX(5px)';
            item.style.color = '#fff';
        });
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateX(0)';
            item.style.color = 'inherit';
        });
    });
});
