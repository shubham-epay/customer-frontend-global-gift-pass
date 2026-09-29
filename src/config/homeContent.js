/*
 * Design artwork for home-page sections the backend has no data (or no images) for yet.
 * Images were cropped from the design screenshots - replace the files in src/assets with the
 * originals from the designer for full resolution.
 */
import shopping from '../assets/categories/shopping.png';
import experiences from '../assets/categories/experiences.png';
import dining from '../assets/categories/dining.png';
import travel from '../assets/categories/travel.png';
import entertainment from '../assets/categories/entertainment.png';
import wellness from '../assets/categories/wellness.png';
import him from '../assets/recipients/him.png';
import her from '../assets/recipients/her.png';
import couples from '../assets/recipients/couples.png';
import kids from '../assets/recipients/kids.png';
import birthday from '../assets/occasions/birthday.png';
import wedding from '../assets/occasions/wedding.png';
import anniversary from '../assets/occasions/anniversary.png';
import kidzania from '../assets/brands/kidzania.png';
import carrefour from '../assets/brands/carrefour.png';
import sharafDg from '../assets/brands/sharaf-dg.png';
import noon from '../assets/brands/noon.png';

/** Category artwork, matched to a backend category by name/slug keywords (first match wins). */
const CATEGORY_ART = [
  { match: /spa|wellness|beauty|massage|relax|salon/i, image: wellness, text: 'Relax and recharge' },
  { match: /dining|gourmet|food|restaurant|brunch|dinner/i, image: dining, text: 'Culinary delights' },
  { match: /entertain|gam|fun|kid|cinema|show/i, image: entertainment, text: 'Fun for everyone' },
  { match: /travel|trip|flight|holiday/i, image: travel, text: 'Explore new horizons' },
  { match: /stay|hotel|resort|experien|adventure|days?.?out/i, image: experiences, text: 'Unforgettable moments' },
  { match: /shop|brand|retail|fashion|gift.?card/i, image: shopping, text: 'Your favourite brands' },
];
const ROTATION = [shopping, experiences, dining, travel, entertainment, wellness];

/** Design image + one-liner for a category; unmatched categories rotate through the set. */
export function categoryArt(category, index = 0) {
  const key = `${category.name} ${category.slug}`;
  return CATEGORY_ART.find((a) => a.match.test(key)) || { image: ROTATION[index % ROTATION.length], text: '' };
}

/** Whole-card artwork (title and "Shop now" are part of the image). */
export const RECIPIENTS = [
  { title: 'Gifts for Him', image: him, to: '/deals' },
  { title: 'Gifts for Her', image: her, to: '/deals' },
  { title: 'Gifts for Couples', image: couples, to: '/deals' },
  { title: 'Gifts for Kids', image: kids, to: '/deals' },
];

export const OCCASIONS = [
  { title: 'Birthday Gifts', image: birthday, to: '/deals' },
  { title: 'Wedding Gifts', image: wedding, to: '/deals' },
  { title: 'Anniversary Gifts', image: anniversary, to: '/deals' },
];

/** Brand gift cards; each opens a search for that brand's products (KidZania eGift Cards exist today). */
export const GIFT_CARDS = [
  { title: 'KidZania Gift Card', text: 'Play. Learn. Explore.', image: kidzania, query: 'KidZania' },
  { title: 'Carrefour Gift Card', text: 'Everyday essentials and more.', image: carrefour, query: 'Carrefour' },
  { title: 'Sharaf DG Gift Card', text: 'Latest electronics and lifestyle.', image: sharafDg, query: 'Sharaf DG' },
  { title: 'Noon Gift Card', text: 'Shop your favourites.', image: noon, query: 'Noon' },
];

/** Products whose title marks them as a brand gift card belong in "Popular Gift Cards", not "Gift Passes". */
export const isGiftCard = (product) => /gift\s*card/i.test(product.title || '');
