import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../utils/httpError";
import { productId } from "../../utils/uniqueId";
import * as categoriesService from "../categories/categories.service";

const publicSelect = {
  uniqueId: true,
  name: true,
  imageUrl: true,
  price: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { uniqueId: true, name: true } },
} as const;

export interface ListParams {
  page: number;
  limit: number;
  sort?: "price:asc" | "price:desc";
  search?: string;
  categoryUniqueId?: string;
}

export const list = async (params: ListParams) => {
  const { page, limit, sort, search, categoryUniqueId } = params;

  const where: Prisma.ProductWhereInput = { deletedAt: null };
  if (categoryUniqueId) {
    where.category = { uniqueId: categoryUniqueId, deletedAt: null };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "price:asc") orderBy = { price: "asc" };
  else if (sort === "price:desc") orderBy = { price: "desc" };

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: publicSelect,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

interface CreateArgs {
  name: string;
  price: number;
  categoryUniqueId: string;
  imageUrl?: string;
}

export const create = async ({ name, price, categoryUniqueId, imageUrl }: CreateArgs) => {
  const category = await categoriesService.findActiveByUniqueId(categoryUniqueId);
  if (!category) throw new HttpError(404, "NOT_FOUND", "Category not found");
  return prisma.product.create({
    data: {
      uniqueId: productId(),
      name,
      price: new Prisma.Decimal(price),
      categoryId: category.id,
      imageUrl,
    },
    select: publicSelect,
  });
};

export const getByUniqueId = async (uniqueId: string) => {
  const product = await prisma.product.findFirst({
    where: { uniqueId, deletedAt: null },
    select: publicSelect,
  });
  if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found");
  return product;
};

interface UpdateArgs {
  name?: string;
  price?: number;
  categoryUniqueId?: string;
  imageUrl?: string;
}

export const update = async (uniqueId: string, data: UpdateArgs) => {
  const existing = await prisma.product.findFirst({
    where: { uniqueId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Product not found");

  const patch: Prisma.ProductUpdateInput = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.price !== undefined) patch.price = new Prisma.Decimal(data.price);
  if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
  if (data.categoryUniqueId) {
    const category = await categoriesService.findActiveByUniqueId(data.categoryUniqueId);
    if (!category) throw new HttpError(404, "NOT_FOUND", "Category not found");
    patch.category = { connect: { id: category.id } };
  }

  return prisma.product.update({
    where: { id: existing.id },
    data: patch,
    select: publicSelect,
  });
};

export const softDelete = async (uniqueId: string) => {
  const existing = await prisma.product.findFirst({
    where: { uniqueId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Product not found");
  await prisma.product.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
};
