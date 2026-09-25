# Волонтёрский компас

Тест на определение волонтёрской направленности личности — домашнее задание по ОИС, МГТУ им. Н.Э. Баумана.

Простая система принятия решений: по ответам на 20 вопросов она рекомендует одно из четырёх направлений волонтёрства и объясняет, почему оно подходит. Бэкенда нет, вся логика работает в браузере.

**Направления:** дети и подростки · люди с инвалидностью · старшее поколение · экология.

## Что где лежит

| Путь | Что это |
|---|---|
| [`content/quiz.json`](content/quiz.json) | База знаний: направления, вопросы, варианты, веса, фразы для объяснения результата |
| [`content/images.json`](content/images.json) | Фото: файл, описание для незрячих, автор и лицензия |
| [`src/engine/`](src/engine) | Механизм вывода: подсчёт баллов, выбор направления, объяснение |
| [`src/`](src) | Интерфейс на React: стартовый экран, вопросы, результат |
| [`public/images/`](public/images) | Фото из открытых источников, сжатые в WebP |
| [`DESIGN.md`](DESIGN.md) | Дизайн-система |
| [`scripts/`](scripts) | Проверка весов и сборка документации |
| [`docs/methodology.md`](docs/methodology.md) | Как устроены вопросы и почему веса именно такие |
| [`docs/questions.md`](docs/questions.md), [`docs/questions.csv`](docs/questions.csv) | Все вопросы с весами — для чтения и для Excel |
| [`docs/validation.md`](docs/validation.md) | Результаты проверки: баланс, тестовые персоны, случайные анкеты |
| [`docs/credits.md`](docs/credits.md) | Авторы и лицензии фото |

## Команды

Нужен Node.js 22.18 или новее: скрипты написаны на TypeScript и запускаются без сборки.

```bash
npm install
```

```bash
npm run dev
```

Запускает сайт локально с автообновлением.

```bash
npm run build
```

Проверяет типы и собирает сайт в `dist/`. Посмотреть сборку — `npm run preview`.

```bash
npm run check
```

Проверяет контент, веса и картинки. Если что-то не так, завершается с ошибкой.

```bash
npm run docs
```

Пересобирает `docs/questions.md`, `docs/questions.csv`, `docs/validation.md` и `docs/credits.md` после правок в `content/`.

## Источники

- Дизайн-система — [`DESIGN.md`](DESIGN.md) из коллекции [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (лицензия MIT), разбор дизайна Airbnb. Вместо закрытого шрифта Airbnb Cereal используется Inter.
- Фото — Wikimedia Commons и Flickr под свободными лицензиями, авторы перечислены в [`docs/credits.md`](docs/credits.md) и на сайте.
