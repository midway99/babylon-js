# Babylon Physics Snake

Локальный Vite + TypeScript проект с Babylon.js и Havok Physics V2.

## Что реализовано

- змейка из четырех мешей-параллелепипедов;
- у каждого сегмента есть `PhysicsAggregate` с `PhysicsShapeType.BOX`;
- соседние сегменты связаны `BallAndSocketConstraint`;
- каждый mesh хранит `metadata = { id: "..." }`;
- каждому сегменту назначен отдельный `StandardMaterial`.

## Запуск

```bash
npm install
npm run dev
```

## Проверка сборки

```bash
npm run build
```
