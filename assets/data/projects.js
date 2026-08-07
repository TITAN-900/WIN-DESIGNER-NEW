(function () {
  const whatsappNumber = "601172455699";
  const whatsappBase = `https://wa.me/${whatsappNumber}`;
  const siteUrl = "https://titan-900.github.io/WIN-DESIGNER-NEW/";

  // Future project workflow:
  // 1. Create a folder such as assets/projects/new-project-name/.
  // 2. Add optimized cover and gallery images.
  // 3. Add one project object to the array below.
  // The homepage and project page will render the new project automatically.
  const projects = [
    {
      slug: "walnut-residence",
      title: "Walnut Residence",
      type: "Living Room",
      intro: "Warm walnut cabinetry, soft light and calm daily living.",
      description:
        "A composed residential interior shaped around storage, proportion and warm evening light.",
      cover: {
        src: "livingroom.jpg.jpg",
        alt: "Warm walnut living room with custom cabinetry and concealed lighting",
        width: 1280,
        height: 854
      },
      gallery: [
        {
          src: "livingroom.jpg.jpg",
          alt: "Walnut living room with custom cabinetry",
          width: 1280,
          height: 854
        },
        {
          src: "assets/projects/optimized/malaysia-luxury-condo-living.webp",
          alt: "Completed Malaysian condominium living room with warm walnut finishes",
          width: 1536,
          height: 1024
        },
        {
          src: "livingroom3.jpg.jpg",
          alt: "Open residential living and dining space with warm lighting",
          width: 1280,
          height: 960
        },
        {
          src: "assets/win20/project-study.webp",
          alt: "Built-in cabinetry detail with hidden lighting",
          width: 1586,
          height: 992
        }
      ],
      beforeAfter: [
        {
          note: "Reference pair. Replace with verified same-room, same-angle client photos when available.",
          before: {
            src: "assets/projects/optimized/before-empty-concrete-condo.webp",
            alt: "Before renovation empty condominium interior with bare concrete floor",
            width: 1536,
            height: 1024
          },
          after: {
            src: "assets/projects/optimized/after-luxury-condo-living.jpeg.webp",
            alt: "After renovation completed condominium living room with warm finishes",
            width: 1280,
            height: 853
          }
        }
      ]
    },
    {
      slug: "stone-kitchen",
      title: "Stone Kitchen",
      type: "Kitchen",
      intro: "Stone surfaces, walnut storage and a quieter cooking space.",
      description:
        "A kitchen direction built around practical circulation, durable surfaces and fitted cabinetry.",
      cover: {
        src: "livingroom2.jpg.jpg",
        alt: "Luxury kitchen with stone island, walnut cabinetry and warm lighting",
        width: 1280,
        height: 720
      },
      gallery: [
        {
          src: "livingroom2.jpg.jpg",
          alt: "Stone kitchen island with walnut cabinetry",
          width: 1280,
          height: 720
        },
        {
          src: "assets/projects/optimized/malaysia-luxury-kitchen-dining.webp",
          alt: "Malaysian luxury kitchen and dining area with cream stone and walnut cabinetry",
          width: 1536,
          height: 1024
        },
        {
          src: "assets/win20/project-kitchen.webp",
          alt: "Cream marble kitchen with concealed lighting",
          width: 1536,
          height: 1024
        }
      ],
      beforeAfter: []
    },
    {
      slug: "private-suite",
      title: "Private Suite",
      type: "Bedroom",
      intro: "Soft fabrics, walnut accents and layered warm lighting.",
      description:
        "A restful suite with quiet storage, gentle contrast and a softer material palette.",
      cover: {
        src: "livingroom4.jpg.jpg",
        alt: "Calm luxury bedroom with walnut feature wall and soft beige fabrics",
        width: 1280,
        height: 960
      },
      gallery: [
        {
          src: "livingroom4.jpg.jpg",
          alt: "Luxury bedroom with walnut feature wall",
          width: 1280,
          height: 960
        },
        {
          src: "assets/projects/optimized/malaysia-luxury-bedroom.webp",
          alt: "Completed Malaysian bedroom with beige fabrics and hidden lighting",
          width: 1536,
          height: 1024
        },
        {
          src: "assets/win20/project-bedroom.webp",
          alt: "Premium bedroom with fitted wardrobe wall",
          width: 1536,
          height: 1024
        }
      ],
      beforeAfter: []
    },
    {
      slug: "open-living",
      title: "Open Living",
      type: "Living and Dining",
      intro: "A connected room for hosting, dining and everyday rest.",
      description:
        "An open-plan interior arranged with clear circulation, calm finishes and generous image-led composition.",
      cover: {
        src: "livingroom3.jpg.jpg",
        alt: "Open Malaysian condominium living and dining space with warm walnut accents",
        width: 1280,
        height: 960
      },
      gallery: [
        {
          src: "livingroom3.jpg.jpg",
          alt: "Open living and dining room with warm walnut details",
          width: 1280,
          height: 960
        },
        {
          src: "assets/projects/optimized/malaysia-luxury-condo-living.webp",
          alt: "Completed Malaysian luxury condominium living room",
          width: 1536,
          height: 1024
        },
        {
          src: "assets/win20/project-foyer.webp",
          alt: "Walnut foyer cabinetry detail",
          width: 1536,
          height: 1024
        }
      ],
      beforeAfter: []
    },
    {
      slug: "foyer-cabinetry",
      title: "Foyer Cabinetry",
      type: "Custom Cabinetry",
      intro: "A warm entry sequence with concealed storage and stone detail.",
      description:
        "A cabinetry-led entry area designed for storage, proportion and a refined first impression.",
      cover: {
        src: "assets/win20/project-foyer.webp",
        alt: "Luxury Malaysian foyer cabinetry with walnut finishes",
        width: 1536,
        height: 1024
      },
      gallery: [
        {
          src: "assets/win20/project-foyer.webp",
          alt: "Luxury Malaysian foyer cabinetry",
          width: 1536,
          height: 1024
        },
        {
          src: "assets/projects/optimized/malaysia-walnut-foyer-cabinetry.webp",
          alt: "Walnut foyer cabinetry with hidden lighting",
          width: 1536,
          height: 1024
        },
        {
          src: "assets/win20/project-study.webp",
          alt: "Study cabinetry detail with warm shelves",
          width: 1586,
          height: 992
        }
      ],
      beforeAfter: []
    },
    {
      slug: "built-in-study",
      title: "Built-In Study",
      type: "Study",
      intro: "A quiet work area with warm built-ins and hidden light.",
      description:
        "A compact study shaped by fitted cabinetry, useful storage and calm material control.",
      cover: {
        src: "assets/win20/project-study.webp",
        alt: "Elegant Malaysian study with warm built-in cabinetry and hidden LED lighting",
        width: 1586,
        height: 992
      },
      gallery: [
        {
          src: "assets/win20/project-study.webp",
          alt: "Built-in study cabinetry with warm lighting",
          width: 1586,
          height: 992
        },
        {
          src: "assets/projects/optimized/malaysia-study-lounge.webp",
          alt: "Warm Malaysian study lounge with walnut built-ins",
          width: 1586,
          height: 992
        },
        {
          src: "livingroom5.jpg.jpg",
          alt: "Neutral modern interior detail with warm lighting",
          width: 1280,
          height: 960
        }
      ],
      beforeAfter: []
    }
  ];

  window.WIN_DESIGN_DATA = {
    site: {
      name: "WIN DESIGN",
      url: siteUrl,
      logo: "assets/win20/win-design-logo-nav-compact.png",
      hero: {
        src: "assets/win20/hero-condo.webp",
        alt: "Modern Malaysian condominium interior with warm walnut cabinetry and concealed lighting",
        width: 1536,
        height: 1024
      },
      whatsappNumber,
      whatsappBase,
      phoneDisplay: "+60 1172455699",
      phoneHref: "tel:+601172455699"
    },
    projects
  };
})();
