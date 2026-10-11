'use strict';

// Летопись замыслов — ToDo-лист для писателей.
// В index.html нет разметки: вся страница строится здесь, через DOM API.

// Ссылки на элементы, которые понадобятся логике приложения
// (форма, поля, список). Заполняются при сборке страницы.
const ui = {};

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
}

init();
