import { Category } from './category';

export interface Product {
  uniqueId: string;
  name: string;
  imageUrl: string | null;
  price: number;
  category: Pick<Category, 'uniqueId' | 'name'>;
  createdAt?: string;
  updatedAt?: string;
}
