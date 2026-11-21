-- 充值订单。主键是 UUID，金额是整数分，到账算力含赠送。
-- 状态：pending / paid / expired / failed。有效期由应用写入 expires_at。
-- 回滚：20261130_recharge_orders_rollback.sql
-- 幂等：可以重复执行。远端库由人工工单执行，这里不连远端。

BEGIN;

CREATE TABLE IF NOT EXISTS recharge_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  amount_fen integer NOT NULL,
  credits integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  expires_at timestamptz(6) NOT NULL,
  paid_at timestamptz(6)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recharge_orders_user_id_fkey'
  ) THEN
    ALTER TABLE recharge_orders
      ADD CONSTRAINT recharge_orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recharge_orders_status_check'
  ) THEN
    ALTER TABLE recharge_orders
      ADD CONSTRAINT recharge_orders_status_check
      CHECK (status IN ('pending', 'paid', 'expired', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recharge_orders_user_time
  ON recharge_orders (user_id, created_at);

COMMIT;
