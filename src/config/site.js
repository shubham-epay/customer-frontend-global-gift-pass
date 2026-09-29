/**
 * Static site copy and links that have no backing API. Social URLs are placeholders -
 * fill them in (an icon without a URL is shown but not clickable).
 */
export const SOCIAL_LINKS = {
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
};

/** Slug of the category whose sub-categories feed "Shop by Occasion" on the home page. */
export const OCCASIONS_CATEGORY_SLUG = 'occasions';
/** Slug of the category whose products feed "Popular Gift Cards" on the home page. */
export const GIFT_CARDS_CATEGORY_SLUG = 'gift-cards';

export const HOW_IT_WORKS = [
  { icon: 'cart', title: 'Choose', text: 'Select a gift card, gift pass or experience from top brands.' },
  { icon: 'pen', title: 'Personalize', text: 'Add a personal message to make it theirs (optional).' },
  { icon: 'send', title: 'Send', text: 'Delivered instantly by email — or scheduled for the big day.' },
  { icon: 'gift', title: 'Make Someone Happy', text: 'They redeem it their way and enjoy the moment.' },
];

export const WHY_US = [
  { icon: 'bolt', title: 'Instant Delivery', text: 'Get your gift card in their inbox within minutes.' },
  { icon: 'grid', title: 'Wide Brand Range', text: 'Top global names and unique local favourites.' },
  { icon: 'shield', title: '100% Secure', text: 'Safe, encrypted checkout and reliable transactions.' },
  { icon: 'calendar', title: 'Every Occasion', text: 'Birthdays, anniversaries, corporate gifting and more.' },
];

export const WELCOME_POINTS = [
  {
    icon: 'gift',
    title: 'A world of choices. A world of experiences.',
    text: [
      'Global Gift Pass brings together gift cards, experiences, dining, shopping, entertainment, travel, wellness, and more — all in one place.',
      'From everyday surprises to unforgettable celebrations, discover something for everyone and every occasion.',
    ],
  },
  {
    icon: 'pin',
    title: 'One Gift Pass. So Many Possibilities.',
    text: [
      'Give them the freedom to choose what they love, from exciting experiences to their favourite brands.',
      'Whether you’re gifting for a birthday, anniversary, celebration, or simply because, Global Gift Pass makes every gift more personal.',
    ],
  },
  {
    icon: 'star',
    title: 'Give more than a gift. Give them the freedom to choose.',
    text: ['With instant digital delivery, a wide range of options, and seamless gifting, Global Gift Pass makes every occasion special and effortless.'],
  },
];

/** Informational pages linked from the header/footer that do not have content yet. */
export const INFO_PAGES = {
  corporate: 'Corporate Gifts',
  about: 'About Us',
  partner: 'Partner With Us',
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  faqs: 'FAQs',
  contact: 'Contact Us',
};

export const HERO = {
  title: 'Give the Gift of Great Taste',
  text: 'From intimate dinners to exceptional culinary experiences, choose a gift they’ll remember.',
  cta: 'Explore Dining Experiences',
  /** Category the hero button opens (falls back to a "dining" search when the category does not exist). */
  categorySlug: 'dining',
};

export const PROMO_BAND = {
  title: ['More Than a Gift Card.', 'A World of'],
  accent: 'Experiences.',
  text: 'Give the freedom to explore, dine, shop and unwind with top global brands and unique experiences.',
  cta: 'Explore More',
};

export const TESTIMONIALS = [
  { name: 'Priya S.', location: 'Dubai, UAE', quote: 'Such a convenient way to gift! Perfect for any occasion.', tone: '#D9283A' },
  { name: 'Ahmed R.', location: 'Abu Dhabi, UAE', quote: 'Great variety of brands and amazing experiences.', tone: '#14224A' },
  { name: 'Sara M.', location: 'Sharjah, UAE', quote: 'Fast delivery and so easy to use. Highly recommended!', tone: '#8A5A44' },
];
