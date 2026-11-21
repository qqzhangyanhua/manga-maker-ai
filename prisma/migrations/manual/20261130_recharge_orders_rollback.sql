-- 回滚 20261130_recharge_orders.sql。

BEGIN;

DROP TABLE IF EXISTS recharge_orders;

COMMIT;
