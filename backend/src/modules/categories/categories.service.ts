import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../utils/httpError";
import { categoryId } from "../../utils/uniqueId";

const publicSelect = {
  uniqueId: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

interface ListParams {
  search?: string;
  page: number;
  limit: number;
}

export const list = async ({ search, page, limit }: ListParams) => {
  const where: Prisma.CategoryWhereInput = { deletedAt: null };
  if (search) where.name = { contains: search, mode: "insensitive" };

  const [data, total] = await prisma.$transaction([
    prisma.category.findMany({
      where,
      select: publicSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.category.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getByUniqueId = async (uniqueId: string) => {
  const cat = await prisma.category.findFirst({
    where: { uniqueId, deletedAt: null },
    select: publicSelect,
  });
  if (!cat) throw new HttpError(404, "NOT_FOUND", "Category not found");
  return cat;
};

export const findActiveByUniqueId = async (uniqueId: string) => {
  return prisma.category.findFirst({
    where: { uniqueId, deletedAt: null },
    select: { id: true, uniqueId: true, name: true },
  });
};

export const create = async (name: string) => {
  return prisma.category.create({
    data: { uniqueId: categoryId(), name },
    select: publicSelect,
  });
};

export const update = async (uniqueId: string, data: { name?: string }) => {
  const existing = await prisma.category.findFirst({
    where: { uniqueId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Category not found");
  return prisma.category.update({
    where: { id: existing.id },
    data,
    select: publicSelect,
  });
};

export const softDelete = async (uniqueId: string) => {
  const existing = await prisma.category.findFirst({
    where: { uniqueId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw new HttpError(404, "NOT_FOUND", "Category not found");
  await prisma.category.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
};
