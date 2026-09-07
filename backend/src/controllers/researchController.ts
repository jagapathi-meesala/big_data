import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db';

// Read-only access to the RADAR research pipeline's serving tables. The
// tables are created/refreshed by bigdata/serving/write_to_postgres.py and
// bigdata/streaming/stream_job.py — this controller never writes.

interface DdrpsRow {
  district: string;
  scheme: string;
  qd: number | null;
  qd_upper: number | null;
  dd: number | null;
  hd: number | null;
  md: number | null;
  vd: number | null;
  ddrps: number | null;
  risk_rank: number | null;
  priority_rank: number | null;
  category: string | null;
  population: number | null;
}

const empty = (res: Response, what: string) =>
  res.status(200).json({
    available: false,
    message: `${what} is not published yet. Run the RADAR pipeline (run_pipeline.sh) and bigdata/serving/write_to_postgres.py.`,
    data: []
  });

export const getDdrpsRanking = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await sequelize.query<DdrpsRow>(
      'SELECT district, scheme, qd, qd_upper, dd, hd, md, vd, ddrps, risk_rank, priority_rank, category, population FROM research_ddrps_ranking ORDER BY scheme ASC, priority_rank ASC',
      { type: QueryTypes.SELECT }
    );
    if (!rows || rows.length === 0) {
      empty(res, 'DDRPS ranking');
      return;
    }
    res.status(200).json({ available: true, count: rows.length, data: rows });
  } catch (error: any) {
    // table missing in a fresh DB — degrade gracefully, not 500
    empty(res, 'DDRPS ranking');
  }
};

export const getValidationSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await sequelize.query<{ payload: unknown }>(
      'SELECT payload FROM research_validation_summary WHERE id = 1 LIMIT 1',
      { type: QueryTypes.SELECT }
    );
    if (!rows || rows.length === 0 || !rows[0].payload) {
      empty(res, 'Validation summary');
      return;
    }
    res.status(200).json({ available: true, data: rows[0].payload });
  } catch (error: any) {
    empty(res, 'Validation summary');
  }
};

export const getModelMetrics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await sequelize.query(
      'SELECT target, model, split, roc_auc, pr_auc, n_pos, n FROM research_model_metrics ORDER BY target, model, split',
      { type: QueryTypes.SELECT }
    );
    if (!rows || rows.length === 0) {
      empty(res, 'Model metrics');
      return;
    }
    res.status(200).json({ available: true, count: rows.length, data: rows });
  } catch (error: any) {
    empty(res, 'Model metrics');
  }
};

interface LiveAlertRow {
  district: string;
  ts: string;
  rain_mm: number | null;
  temp_c: number | null;
  wind_kmh: number | null;
  qd_live: number | null;
  ddrps_live: number | null;
  category: string | null;
  lat: number | null;
  lon: number | null;
}

export const getLiveAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await sequelize.query<LiveAlertRow>(
      `SELECT DISTINCT ON (district)
              district, ts, rain_mm, temp_c, wind_kmh, qd_live, ddrps_live, category,
              ST_Y(geom) AS lat, ST_X(geom) AS lon
       FROM live_alerts
       WHERE ts > now() - interval '24 hours'
       ORDER BY district, ts DESC`,
      { type: QueryTypes.SELECT }
    );
    if (!rows || rows.length === 0) {
      empty(res, 'Live alerts (streaming layer)');
      return;
    }
    res.status(200).json({ available: true, count: rows.length, data: rows });
  } catch (error: any) {
    empty(res, 'Live alerts (streaming layer)');
  }
};
