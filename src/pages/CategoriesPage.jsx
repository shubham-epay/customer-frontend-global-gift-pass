import { Link, useOutletContext } from 'react-router-dom';
import { CategoryCard } from '../components/Cards';
import { Heading } from '../components/Section';
import { PageLoader } from '../components/States';

/** All categories (mobile "Categories" tab). The tree comes from the layout's /api/categories call. */
export default function CategoriesPage() {
  const { categories = [] } = useOutletContext() || {};
  if (!categories.length) return <PageLoader />;
  return (
    <div className="container listing">
      <nav className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Categories</span></nav>
      <Heading title="Shop by" accent="Category" as="h1" className="section__title" />
      <div className="grid grid--cats">{categories.map((c, i) => <CategoryCard key={c._id} category={c} index={i} />)}</div>
    </div>
  );
}
