/**
 * Adopted from https://github.com/savannabits/typeorm-pagination/blob/master/src/helpers/pagination.ts
 */
import { BaseEntity, FindManyOptions, SelectQueryBuilder } from "typeorm";

export const paginate = async function <T>(
	builder: SelectQueryBuilder<any>,
	page: number,
	limit: number,
	offset?: number | null,
): Promise<PaginationAwareObject<T>> {
	const skip = offset ?? (page - 1) * limit;
	const total = builder;
	const count = await total.getCount();
	const calculate_last_page = count % limit;
	const last_page =
		calculate_last_page === 0 ? count / limit : Math.trunc(count / limit) + 1;
	const res = await builder.skip(skip).take(limit).getMany();

	return {
		data: !Array.isArray(res) ? [res] : res,
		paginator: {
			offset: skip <= count ? skip + 1 : null,
			limit: count > skip + limit ? skip + limit : count,
			perPage: limit,
			itemsCount: count,
			page: page,
			prevPage: page > 1 ? page - 1 : null,
			nextPage: count > skip + limit ? page + 1 : null,
			pageCount: last_page,
		},
	};
};

export interface PaginationAwareObject<T> {
	data: T[];
	paginator: {
		offset: any;
		limit: any;
		perPage: any;
		itemsCount: number | any;
		page: number;
		prevPage?: number | null;
		nextPage?: number | null;
		pageCount: number | null;
	};
}

declare module "typeorm" {
	export interface SelectQueryBuilder<Entity> {
		paginate(
			limit?: number | null,
			offset?: number | null,
			page?: number | null,
		): Promise<PaginationAwareObject<Entity>>;
	}

	export interface BaseEntity {
		paginate<T extends BaseEntity>(
			opts: {
				limit?: number | null;
				offset?: number | null;
				page?: number | null;
			} & FindManyOptions<T>,
		): Promise<PaginationAwareObject<T>>;
	}
}

/**
 * Boot the package by patching the SelectQueryBuilder
 *
 */
SelectQueryBuilder.prototype.paginate = async function <T>(
	limit?: number | null,
	offset?: number | null,
	page?: number | null,
): Promise<PaginationAwareObject<T>> {
	return await paginate(this, page ?? 1, limit ?? 100, offset);
};

BaseEntity.prototype.paginate = async function <Entity extends BaseEntity>(
	opts: {
		limit?: number | null;
		offset?: number | null;
		page?: number | null;
	} & FindManyOptions<Entity>,
): Promise<PaginationAwareObject<Entity>> {
	const { offset } = opts;

	const page = opts.page ?? 1;
	const limit = opts.limit ?? 100;

	const skip = offset ?? (page - 1) * limit;
	if (opts.take == null) {
		opts.take = limit;
	}
	if (opts.skip == null) {
		opts.skip = skip;
	}

	delete opts.limit;
	delete opts.page;
	delete opts.offset;

	const results: [Entity[], number] = await this.constructor.findAndCount(opts);

	const count = results[1];
	const calculate_last_page = count % limit;
	const last_page =
		calculate_last_page === 0 ? count / limit : Math.trunc(count / limit) + 1;

	return {
		data: results[0],
		paginator: {
			offset: skip <= count ? skip + 1 : null,
			limit: count > skip + limit ? skip + limit : count,
			perPage: limit,
			itemsCount: count,
			page: page,
			prevPage: page > 1 ? page - 1 : null,
			nextPage: count > skip + limit ? page + 1 : null,
			pageCount: last_page,
		},
	};
};
