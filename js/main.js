'use strict';

// Летопись замыслов — ToDo-лист для писателей.
// В index.html нет разметки: вся страница строится здесь, через DOM API.

// Ссылки на элементы, которые понадобятся логике приложения
// (форма, поля, список). Заполняются при сборке страницы.
const ui = {};

// ===== Состояние приложения =====

// Все задачи. Порядок в массиве = «свой порядок» пользователя.
// Задача выглядит так:
// { id: 'lq3x9k2f', title: 'Глава XII', date: '2026-10-20', done: false }
let tasks = [];

// id только что добавленной задачи — чтобы проиграть анимацию
// появления только у неё, а не у всего списка.
let justAddedId = null;

// То же для только что завершённой задачи: «перо» зачёркивает
// строку только у неё, а не у всех завершённых при каждой перерисовке.
let justCompletedId = null;

// id задачи, которая сейчас редактируется (или null).
// Редактировать можно одну задачу за раз.
let editingId = null;

// ===== Утилиты =====

// Создаёт элемент: тег, класс, текст, атрибуты и вложенные элементы.
// Внутри — обычные document.createElement, className, textContent,
// setAttribute и append; функция лишь избавляет от повторов.
function createElement(tag, options = {}, children = []) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }
  if (options.text) {
    element.textContent = options.text;
  }
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      element.setAttribute(name, value);
    }
  }

  element.append(...children);
  return element;
}

// Поле формы: подпись + элемент ввода, связанные через for/id.
// Клик по подписи ставит курсор в поле, а экранные дикторы
// зачитывают подпись вместе с полем.
function createField(labelText, control) {
  const label = createElement('label', {
    className: 'field__label',
    text: labelText,
    attrs: { for: control.id },
  });

  return createElement('div', { className: 'field' }, [label, control]);
}

// ===== Подключение стилей =====

// <link> на CSS тоже нельзя писать в HTML, поэтому создаём его здесь.
function connectStyles() {
  const stylesheet = createElement('link', {
    attrs: { rel: 'stylesheet', href: 'css/style.css' },
  });

  document.head.append(stylesheet);
}

// Шрифты Google Fonts — тоже через <link>, тоже из JS.
// preconnect заранее открывает соединение с серверами шрифтов,
// чтобы текст не «прыгал» долго при загрузке.
function connectFonts() {
  const fontsUrl = 'https://fonts.googleapis.com/css2'
    + '?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500'
    + '&family=EB+Garamond:ital,wght@0,400;0,500;1,400'
    + '&family=Ruslan+Display'
    + '&display=swap';

  document.head.append(
    createElement('link', {
      attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    }),
    createElement('link', {
      attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    }),
    createElement('link', {
      attrs: { rel: 'stylesheet', href: fontsUrl },
    }),
  );
}

// ===== Части страницы =====

function buildHeader() {
  return createElement('header', { className: 'header' }, [
    createElement('p', {
      className: 'header__overline',
      text: 'Рабочий журнал сочинителя',
    }),
    createElement('h1', {
      className: 'header__title',
      text: 'Летопись замыслов',
    }),
    createElement('p', {
      className: 'header__subtitle',
      text: 'Главы, сцены и клятвы, данные собственной книге',
    }),
  ]);
}

// Форма новой задачи: название + срок + кнопка.
function buildComposeSection() {
  ui.titleInput = createElement('input', {
    className: 'field__input',
    attrs: {
      type: 'text',
      id: 'task-title',
      name: 'title',
      placeholder: 'Глава XII: осада Чёрной цитадели',
      maxlength: '120',
      autocomplete: 'off',
      required: '',
    },
  });

  ui.dateInput = createElement('input', {
    className: 'field__input',
    attrs: {
      type: 'date',
      id: 'task-date',
      name: 'date',
      required: '',
    },
  });

  const submitButton = createElement('button', {
    className: 'button button--primary',
    text: 'Вписать в летопись',
    attrs: { type: 'submit' },
  });

  ui.form = createElement('form', { className: 'task-form' }, [
    createField('Замысел', ui.titleInput),
    createField('Срок', ui.dateInput),
    submitButton,
  ]);

  return createElement('section', {
    className: 'panel panel--compose',
    attrs: { 'aria-labelledby': 'compose-heading' },
  }, [
    createElement('h2', {
      className: 'panel__title',
      text: 'Новая запись',
      attrs: { id: 'compose-heading' },
    }),
    ui.form,
  ]);
}

// Создаёт <select> из списка вариантов [значение, подпись].
function createSelect(id, options) {
  const select = createElement('select', {
    className: 'field__input',
    attrs: { id, name: id },
  });

  for (const [value, text] of options) {
    select.append(createElement('option', { text, attrs: { value } }));
  }

  return select;
}

// Панель поиска, фильтра и сортировки.
function buildControlsSection() {
  ui.searchInput = createElement('input', {
    className: 'field__input',
    attrs: {
      type: 'search',
      id: 'task-search',
      name: 'search',
      placeholder: 'Найти запись по названию',
      autocomplete: 'off',
    },
  });

  ui.filterSelect = createSelect('task-filter', [
    ['all', 'Все записи'],
    ['active', 'В работе'],
    ['done', 'Завершённые'],
  ]);

  ui.sortSelect = createSelect('task-sort', [
    ['manual', 'Свой порядок'],
    ['date-asc', 'Срок: ближние'],
    ['date-desc', 'Срок: дальние'],
  ]);

  return createElement('section', {
    className: 'panel panel--controls',
    attrs: { 'aria-label': 'Поиск, фильтр и сортировка' },
  }, [
    createField('Поиск', ui.searchInput),
    createField('Показать', ui.filterSelect),
    createField('Порядок', ui.sortSelect),
  ]);
}

// Сам список задач + счётчик + заглушка для пустого списка.
function buildChronicleSection() {
  ui.counter = createElement('p', {
    className: 'chronicle__counter',
    attrs: { 'aria-live': 'polite' },
  });

  ui.taskList = createElement('ul', { className: 'task-list' });

  ui.emptyState = createElement('p', {
    className: 'chronicle__empty',
    text: 'Летопись пуста. Начни первую главу.',
  });

  return createElement('section', {
    className: 'chronicle',
    attrs: { 'aria-labelledby': 'chronicle-heading' },
  }, [
    createElement('div', { className: 'chronicle__head' }, [
      createElement('h2', {
        className: 'chronicle__title',
        text: 'Записи',
        attrs: { id: 'chronicle-heading' },
      }),
      ui.counter,
    ]),
    ui.taskList,
    ui.emptyState,
  ]);
}

function buildFooter() {
  return createElement('footer', { className: 'footer' }, [
    createElement('p', {
      className: 'footer__text',
      text: 'Записи хранятся в этом браузере. Чернила не выцветут, пока не очистишь кэш.',
    }),
  ]);
}

// ===== Даты и слова =====

// Сегодняшняя дата в формате поля <input type="date">: 'ГГГГ-ММ-ДД'.
function getTodayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// '2026-10-20' → «20 октября 2026».
// Дату собираем из частей, а не через new Date('2026-10-20'):
// такая строка читается как полночь по UTC, и в часовых поясах
// западнее Гринвича дата съехала бы на день назад.
function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  // toLocaleDateString возвращает «20 октября 2026 г.» — хвост « г.» убираем.
  return date
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(' г.', '');
}

// Склонение по числу: 1 запись, 3 записи, 5 записей, 11 записей.
function pluralize(count, one, few, many) {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// Приводим текст к виду для поиска: нижний регистр и «ё» → «е».
// Тогда «Чёрной», «черной» и «ЧЕРНОЙ» найдут одно и то же.
// Длина строки при этом не меняется — это важно для подсветки.
function normalize(text) {
  return text.toLowerCase().replaceAll('ё', 'е');
}

// Текущий поисковый запрос в нормализованном виде.
function getSearchQuery() {
  return normalize(ui.searchInput.value.trim());
}

// Разбивает название на куски и оборачивает совпадения в <mark>.
// Собираем через DOM-узлы, а не через innerHTML: если в названии
// окажется текст вроде <img onerror=...>, он останется просто текстом.
function createHighlightedText(text, query) {
  if (query === '') {
    return [text];
  }

  const parts = [];
  const normalizedText = normalize(text);
  let position = 0;
  let matchIndex = normalizedText.indexOf(query);

  while (matchIndex !== -1) {
    parts.push(text.slice(position, matchIndex));
    parts.push(createElement('mark', {
      className: 'task__match',
      text: text.slice(matchIndex, matchIndex + query.length),
    }));

    position = matchIndex + query.length;
    matchIndex = normalizedText.indexOf(query, position);
  }

  parts.push(text.slice(position));
  return parts;
}

// Короткий уникальный id: время в миллисекундах + случайный хвост.
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== Хранение в localStorage =====

// Ключ, под которым лежат задачи. Версия в конце — на случай,
// если формат задачи когда-нибудь поменяется: старые данные
// под старым ключом не сломают новую версию приложения.
const STORAGE_KEY = 'chronicle.tasks.v1';

// localStorage хранит только строки, поэтому массив превращаем
// в JSON-текст. Обёрнуто в try: в приватном режиме некоторых
// браузеров или при переполнении хранилища запись бросает ошибку,
// и без try из-за неё сломалась бы вся перерисовка.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.warn('Не удалось сохранить летопись:', error);
  }
}

// Проверка, что из хранилища пришла именно задача, а не мусор
// (например, если кто-то поправил данные руками в DevTools).
function isValidTask(item) {
  return item !== null
    && typeof item === 'object'
    && typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.date === 'string'
    && typeof item.done === 'boolean';
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    // При первом запуске ключа ещё нет — getItem вернёт null.
    if (saved === null) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
  } catch (error) {
    // Повреждённый JSON или недоступное хранилище — начинаем с чистого листа,
    // а не падаем с белым экраном.
    console.warn('Не удалось прочитать летопись:', error);
    return [];
  }
}

// ===== Отрисовка =====

// Карточка в режиме редактирования: вместо текста — форма
// с теми же полями, что и при создании, заполненными текущими значениями.
function createEditElement(task) {
  const titleInput = createElement('input', {
    className: 'field__input',
    attrs: {
      type: 'text',
      id: `edit-title-${task.id}`,
      name: 'title',
      maxlength: '120',
      autocomplete: 'off',
      required: '',
    },
  });
  // value — свойство, как и checked: текущее значение поля.
  titleInput.value = task.title;

  const dateInput = createElement('input', {
    className: 'field__input',
    attrs: {
      type: 'date',
      id: `edit-date-${task.id}`,
      name: 'date',
      required: '',
    },
  });
  dateInput.value = task.date;

  const saveButton = createElement('button', {
    className: 'button button--primary',
    text: 'Сохранить',
    attrs: { type: 'submit' },
  });

  const cancelButton = createElement('button', {
    className: 'task__button',
    text: 'Отмена',
    attrs: { type: 'button', 'data-action': 'cancel-edit' },
  });

  const form = createElement('form', {
    className: 'task__edit-form',
    attrs: { 'aria-label': `Правка записи «${task.title}»` },
  }, [
    createField('Замысел', titleInput),
    createField('Срок', dateInput),
    createElement('div', { className: 'task__edit-actions' }, [saveButton, cancelButton]),
  ]);

  return createElement('li', {
    className: 'task task--editing',
    attrs: { 'data-id': task.id },
  }, [form]);
}

// Карточка одной задачи.
function createTaskElement(task) {
  if (task.id === editingId) {
    return createEditElement(task);
  }

  const item = createElement('li', {
    className: 'task',
    attrs: { 'data-id': task.id },
  });

  // Срок прошёл — помечаем, чтобы писатель видел просроченные клятвы.
  // Строки 'ГГГГ-ММ-ДД' можно сравнивать напрямую, как текст:
  // порядок символов совпадает с порядком дат.
  // У завершённой задачи срок уже не важен.
  const isOverdue = !task.done && task.date < getTodayString();

  // classList.toggle(класс, условие) добавляет класс, если условие
  // истинно, и убирает, если ложно.
  item.classList.toggle('task--overdue', isOverdue);
  item.classList.toggle('task--done', task.done);
  item.classList.toggle('task--new', task.id === justAddedId);
  item.classList.toggle('task--just-done', task.id === justCompletedId);

  const checkbox = createElement('input', {
    className: 'task__check',
    attrs: {
      type: 'checkbox',
      'data-action': 'toggle',
      'aria-label': `Отметить запись «${task.title}» завершённой`,
    },
  });
  // checked — свойство, а не атрибут: оно отражает текущее состояние.
  checkbox.checked = task.done;

  // Текст в <span>: линия зачёркивания рисуется фоном строки
  // и должна идти по каждой строке текста, а не по всему блоку.
  // append умеет принимать и строки, и элементы вперемешку —
  // так в название встают куски текста и подсвеченные <mark>.
  const titleText = createElement(
    'span',
    { className: 'task__title-text' },
    createHighlightedText(task.title, getSearchQuery()),
  );
  const title = createElement('p', { className: 'task__title' }, [titleText]);

  let dateText = `До ${formatDate(task.date)}`;
  if (task.done) {
    dateText = `Завершено · срок был ${formatDate(task.date)}`;
  } else if (isOverdue) {
    dateText = `Срок минул: ${formatDate(task.date)}`;
  }

  // <time> — семантический тег для дат; в datetime — машинный формат.
  const date = createElement('time', {
    className: 'task__date',
    text: dateText,
    attrs: { datetime: task.date },
  });

  const body = createElement('div', { className: 'task__body' }, [title, date]);

  // data-action говорит общему обработчику кликов, что делать.
  // aria-label — чтобы экранный диктор прочитал не просто «Сжечь»,
  // а какую именно запись.
  const deleteButton = createElement('button', {
    className: 'task__button task__button--danger',
    text: 'Сжечь',
    attrs: {
      type: 'button',
      'data-action': 'delete',
      'aria-label': `Удалить запись «${task.title}»`,
    },
  });

  const editButton = createElement('button', {
    className: 'task__button',
    text: 'Править',
    attrs: {
      type: 'button',
      'data-action': 'edit',
      'aria-label': `Править запись «${task.title}»`,
    },
  });

  const actions = createElement('div', { className: 'task__actions' }, [
    editButton,
    deleteButton,
  ]);

  item.append(checkbox, body, actions);
  return item;
}

// Сравнение двух задач по сроку. Строки 'ГГГГ-ММ-ДД' сравниваются
// как текст — порядок совпадает с хронологическим.
function compareByDate(a, b) {
  return a.date.localeCompare(b.date);
}

// Какие задачи и в каком порядке показать на экране.
// Сам массив tasks не трогаем: в нём хранится «свой порядок»
// пользователя, а сортировка — лишь способ взглянуть на него иначе.
function getVisibleTasks() {
  const filterMode = ui.filterSelect.value;
  const sortMode = ui.sortSelect.value;
  const query = getSearchQuery();

  // filter() сам возвращает новый массив, так что дальнейший sort()
  // тоже работает с копией и не трогает tasks.
  const visible = tasks.filter((task) => {
    // Поиск: название должно содержать запрос (пустой запрос — подходит всё).
    if (!normalize(task.title).includes(query)) return false;

    if (filterMode === 'active') return !task.done;
    if (filterMode === 'done') return task.done;
    return true; // 'all'
  });

  if (sortMode === 'date-asc') {
    visible.sort(compareByDate);
  } else if (sortMode === 'date-desc') {
    visible.sort((a, b) => compareByDate(b, a));
  }

  return visible;
}

// Перерисовывает список целиком по массиву tasks
// и сохраняет его. Все изменения данных проходят через render(),
// поэтому сохранение здесь не забудется ни в одном действии.
function render() {
  saveTasks();

  const visibleTasks = getVisibleTasks();

  ui.taskList.replaceChildren(...visibleTasks.map(createTaskElement));

  // Заглушка различает два случая: задач нет вообще —
  // или они есть, но под текущие условия ни одна не подошла.
  ui.emptyState.hidden = visibleTasks.length > 0;
  ui.emptyState.textContent = tasks.length === 0
    ? 'Летопись пуста. Начни первую главу.'
    : 'Ни одна запись не отвечает условиям. Измени поиск или фильтр.';

  const doneCount = tasks.filter((task) => task.done).length;
  const word = pluralize(tasks.length, 'запись', 'записи', 'записей');

  let counterText = '';
  if (tasks.length > 0) {
    counterText = `${tasks.length} ${word} · завершено ${doneCount}`;
  }
  // Если показаны не все — пишем, сколько видно.
  if (visibleTasks.length !== tasks.length) {
    counterText += ` · показано ${visibleTasks.length}`;
  }
  ui.counter.textContent = counterText;

  justAddedId = null;
  justCompletedId = null;
}

// ===== Действия =====

function addTask(title, date) {
  const task = {
    id: createId(),
    title,
    date,
    done: false,
  };

  tasks.push(task);
  justAddedId = task.id;
  render();
}

function deleteTask(id) {
  // filter возвращает новый массив без удаляемой задачи
  tasks = tasks.filter((task) => task.id !== id);
  render();
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);

  task.done = !task.done;
  justCompletedId = task.done ? task.id : null;
  render();
}

// Открывает форму правки и ставит курсор в название.
function startEditing(id) {
  editingId = id;
  render();

  const input = ui.taskList.querySelector(`[data-id="${id}"] input[name="title"]`);
  input.focus();
  input.select(); // выделяем текст: можно сразу печатать новый
}

// Закрывает форму правки и возвращает фокус на кнопку «Править».
function stopEditing() {
  const id = editingId;
  editingId = null;
  render();

  const editButton = ui.taskList.querySelector(`[data-id="${id}"] [data-action="edit"]`);
  if (editButton) {
    editButton.focus();
  }
}

function updateTask(id, title, date) {
  const task = tasks.find((item) => item.id === id);

  task.title = title;
  task.date = date;
}

// Сохранение правки. Событие submit тоже всплывает,
// поэтому ловим его на всём списке, как клики.
function handleEditSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const titleInput = form.elements.title;
  const title = titleInput.value.trim();

  if (title === '') {
    titleInput.setCustomValidity('Запись не может состоять из одних пробелов');
    titleInput.reportValidity();
    return;
  }

  updateTask(editingId, title, form.elements.date.value);
  stopEditing();
}

// Esc в форме правки — отмена без сохранения.
function handleListKeydown(event) {
  if (event.key === 'Escape' && editingId !== null) {
    stopEditing();
  }
}

// Сбрасываем свою ошибку, как только пользователь начал исправлять поле.
function handleListInput(event) {
  if (event.target.name === 'title') {
    event.target.setCustomValidity('');
  }
}

// Сначала проигрываем анимацию «сгорания», потом удаляем из данных.
function burnTask(item) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    deleteTask(item.dataset.id);
    return;
  }

  item.classList.add('task--burning');
  item.addEventListener('animationend', () => deleteTask(item.dataset.id), { once: true });
}

// Один обработчик на весь список (делегирование событий).
// Клик по любой кнопке внутри <ul> «всплывает» до самого <ul>,
// а по data-action мы понимаем, какая кнопка нажата.
function handleListClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const item = button.closest('.task');

  const action = button.dataset.action;

  if (action === 'delete') {
    burnTask(item);
  } else if (action === 'edit') {
    startEditing(item.dataset.id);
  } else if (action === 'cancel-edit') {
    stopEditing();
  }
}

// Чекбокс слушаем через change: он срабатывает и от мыши,
// и от пробела с клавиатуры. Тоже делегирование — на весь список.
function handleListChange(event) {
  if (event.target.dataset.action === 'toggle') {
    const id = event.target.closest('.task').dataset.id;
    toggleTask(id);

    // render() создал новый чекбокс, а фокус остался на старом,
    // которого уже нет. Возвращаем фокус — иначе тот, кто работает
    // с клавиатуры, «выпадет» в начало страницы.
    // ?. — на случай, если задача скрылась под фильтром
    // (например, отметили выполненной в режиме «В работе»).
    ui.taskList.querySelector(`[data-id="${id}"] .task__check`)?.focus();
  }
}

function handleFormSubmit(event) {
  // Без этого браузер отправил бы форму и перезагрузил страницу.
  event.preventDefault();

  const title = ui.titleInput.value.trim();

  // required не спасает от строки из одних пробелов — ловим сами
  // и показываем сообщение в том же стиле, что и встроенные.
  if (title === '') {
    ui.titleInput.setCustomValidity('Запись не может состоять из одних пробелов');
    ui.titleInput.reportValidity();
    return;
  }

  addTask(title, ui.dateInput.value);

  ui.form.reset();
  ui.dateInput.value = getTodayString();
  ui.titleInput.focus();
}

function bindEvents() {
  ui.form.addEventListener('submit', handleFormSubmit);
  ui.taskList.addEventListener('click', handleListClick);
  ui.taskList.addEventListener('change', handleListChange);
  ui.taskList.addEventListener('submit', handleEditSubmit);
  ui.taskList.addEventListener('keydown', handleListKeydown);
  ui.taskList.addEventListener('input', handleListInput);

  // Смена порядка — только перерисовка: данные не меняются.
  ui.sortSelect.addEventListener('change', render);
  ui.filterSelect.addEventListener('change', render);

  // input срабатывает на каждый введённый или стёртый символ,
  // включая крестик очистки в поле type="search".
  ui.searchInput.addEventListener('input', render);

  // Как только пользователь начал исправлять поле — снимаем ошибку.
  ui.titleInput.addEventListener('input', () => {
    ui.titleInput.setCustomValidity('');
  });
}

// ===== Запуск =====

function init() {
  connectFonts();
  connectStyles();

  document.body.className = 'page';

  const main = createElement('main', { className: 'container' }, [
    buildComposeSection(),
    buildControlsSection(),
    buildChronicleSection(),
  ]);

  document.body.append(buildHeader(), main, buildFooter());

  ui.dateInput.value = getTodayString();

  tasks = loadTasks();

  bindEvents();
  render();
}

init();
