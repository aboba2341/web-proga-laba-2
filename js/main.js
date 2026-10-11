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

// Короткий уникальный id: время в миллисекундах + случайный хвост.
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== Отрисовка =====

// Карточка одной задачи.
function createTaskElement(task) {
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
  const titleText = createElement('span', {
    className: 'task__title-text',
    text: task.title,
  });
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

  const actions = createElement('div', { className: 'task__actions' }, [deleteButton]);

  item.append(checkbox, body, actions);
  return item;
}

// Перерисовывает список целиком по массиву tasks.
function render() {
  ui.taskList.replaceChildren(...tasks.map(createTaskElement));

  ui.emptyState.hidden = tasks.length > 0;

  const doneCount = tasks.filter((task) => task.done).length;
  const word = pluralize(tasks.length, 'запись', 'записи', 'записей');

  ui.counter.textContent = tasks.length > 0
    ? `${tasks.length} ${word} · завершено ${doneCount}`
    : '';

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

  if (button.dataset.action === 'delete') {
    burnTask(item);
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
    ui.taskList.querySelector(`[data-id="${id}"] .task__check`).focus();
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

  bindEvents();
  render();
}

init();
