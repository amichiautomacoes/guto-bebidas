export interface Category {
  id: string;
  name: string;
  description: string;
  position: number;
  color: string;
  image: string;
}

export interface Product {
  id: number;
  catalog_name: string;
  category_id: string;
  name: string;
  subcategory: string;
  price_cents: number;
  position: number;
  source_page: number;
  active: boolean;
}

export interface Catalog {
  categories: Category[];
  products: Product[];
}
