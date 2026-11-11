-- Artikel blog fakta unik Madura. Forward-only dan aman dijalankan ulang.

create table if not exists blog_posts (
	id bigint generated always as identity primary key,
	title text not null,
	slug text not null unique,
	excerpt text not null default '',
	content text not null default '',
	tag text not null default 'Fakta Unik',
	cover_path text,
	is_published boolean not null default false,
	published_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists blog_posts_published_at_idx on blog_posts(is_published, published_at desc);
