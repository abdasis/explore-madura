create table if not exists users (
	id bigint generated always as identity primary key,
	email text not null unique,
	name text not null,
	password_hash text not null,
	permissions text[] not null default '{}',
	created_at timestamptz not null default now()
);

create table if not exists sessions (
	id bigint generated always as identity primary key,
	token text not null unique,
	user_id bigint not null references users(id) on delete cascade,
	expires_at timestamptz not null,
	created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);
