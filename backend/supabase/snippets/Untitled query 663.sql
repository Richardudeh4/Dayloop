update items
set list_id = (select id from lists where name = 'Work')
where title = 'Design review';
