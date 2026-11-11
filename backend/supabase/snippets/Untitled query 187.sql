select items.title, lists.name as list
from items
join lists on lists.id = items.list_id;
