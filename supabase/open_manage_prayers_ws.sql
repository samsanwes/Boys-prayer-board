-- Boys Prayer Board: open edit / mark answered / remove to anyone with the link,
-- matching the Wesley Family board. Adds UPDATE and DELETE policies to prayers_ws.
-- The old admin_* functions and admin_config are left in place but no longer used.

drop policy if exists "prayers_ws public update" on public.prayers_ws;
create policy "prayers_ws public update"
  on public.prayers_ws for update to anon, authenticated
  using (true)
  with check (length(name) between 1 and 200 and length(text) between 1 and 2000);

drop policy if exists "prayers_ws public delete" on public.prayers_ws;
create policy "prayers_ws public delete"
  on public.prayers_ws for delete to anon, authenticated using (true);

grant update, delete on public.prayers_ws to anon, authenticated;
