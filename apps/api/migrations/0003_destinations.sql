create table if not exists destination_categories (
	id bigint generated always as identity primary key,
	slug text not null unique,
	name text not null,
	icon text not null,
	created_at timestamptz not null default now()
);

create table if not exists destinations (
	id bigint generated always as identity primary key,
	category_id bigint not null references destination_categories(id),
	name text not null,
	slug text not null unique,
	description text not null default '',
	address text not null default '',
	latitude double precision not null,
	longitude double precision not null,
	rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
	is_free boolean not null default false,
	price_min integer check (price_min is null or price_min >= 0),
	price_max integer check (price_max is null or price_max >= 0),
	opening_hours text not null default '',
	contact text not null default '',
	facilities text not null default '',
	is_published boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists destination_photos (
	id bigint generated always as identity primary key,
	destination_id bigint not null references destinations(id) on delete cascade,
	file_path text not null,
	caption text not null default '',
	is_cover boolean not null default false,
	sort_order integer not null default 0,
	created_at timestamptz not null default now()
);

create table if not exists activity_logs (
	id bigint generated always as identity primary key,
	actor_user_id bigint references users(id) on delete set null,
	actor_name text not null,
	action text not null,
	subject_type text not null,
	subject_id bigint,
	description text not null,
	created_at timestamptz not null default now()
);

create index if not exists destinations_category_id_idx on destinations(category_id);
create index if not exists destinations_published_updated_idx on destinations(is_published, updated_at desc);
create index if not exists destination_photos_destination_sort_idx on destination_photos(destination_id, sort_order);
create unique index if not exists destination_photos_one_cover_idx on destination_photos(destination_id) where is_cover;
create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);

insert into destination_categories (slug, name, icon) values
	('beach', 'Pantai', 'Beach02Icon'),
	('religious', 'Religi', 'Mosque01Icon'),
	('nature', 'Alam', 'TreesIcon'),
	('culture', 'Budaya', 'Castle01Icon'),
	('culinary', 'Kuliner', 'Restaurant01Icon')
on conflict (slug) do nothing;
