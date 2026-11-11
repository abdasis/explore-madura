-- Video destinasi: unggahan berkas atau tautan embed. Forward-only dan aman
-- dijalankan ulang.

alter table destinations add column if not exists video_kind text;
alter table destinations add column if not exists video_url text;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'destinations_video_kind_check'
		  and conrelid = 'destinations'::regclass
	) then
		alter table destinations
			add constraint destinations_video_kind_check
			check (video_kind in ('file', 'embed'));
	end if;
end $$;
