#!/usr/bin/env python3
"""ND Wiffle series-import reference validator.
Prototype only: parses and validates one five-file series package; does not publish.
"""
from pathlib import Path
import csv, json, argparse, re

def read_csv(path):
    with open(path,encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))
def n(v):
    try:return float(v)
    except:return 0.0
def active_bat(r):return r.get('Name')!='TOTALS' and n(r.get('PA'))>0
def active_pit(r):return r.get('Name')!='TOTALS' and (n(r.get('IP'))>0 or n(r.get('BF'))>0)
def total(rows):return next((r for r in rows if r.get('Name')=='TOTALS'),{})
def blank(v):return not str(v or '').strip() or str(v).strip().upper() in {'NA','N/A','-'}
def run(home_bat,home_pit,away_bat,away_pit,series,known_players=None,gp_overrides=None):
    hb,hp,ab,ap,s=map(read_csv,[home_bat,home_pit,away_bat,away_pit,series]);gp_overrides=gp_overrides or {}
    checks=[]
    def ck(level,title,detail=''):checks.append({'level':level,'title':title,'detail':detail})
    H,A,HP,AP=total(hb),total(ab),total(hp),total(ap)
    home_runs=sum(int(float(r['home_score'])) for r in s);away_runs=sum(int(float(r['away_score'])) for r in s)
    if len(s)==3:ck('pass','Three game rows found')
    else:ck('error','Series Results must contain exactly 3 game rows',str(len(s)))
    for label,x,y in [('Home PA = visitor BF',H.get('PA'),AP.get('BF')),('Visitor PA = home BF',A.get('PA'),HP.get('BF')),('Home H = visitor pitching H',H.get('H'),AP.get('H')),('Visitor H = home pitching H',A.get('H'),HP.get('H')),('Home BB = visitor pitching BB',H.get('BB'),AP.get('BB')),('Visitor BB = home pitching BB',A.get('BB'),HP.get('BB')),('Home SO = visitor pitching K',H.get('SO'),AP.get('K')),('Visitor SO = home pitching K',A.get('SO'),HP.get('K')),('Home HR = visitor pitching HR',H.get('HR'),AP.get('HR')),('Visitor HR = home pitching HR',A.get('HR'),HP.get('HR'))]:
        ck('pass' if n(x)==n(y) else 'error',label,f'{x} vs {y}')
    ck('pass' if n(H.get('R'))==home_runs else 'warn','Home batting runs vs scoreboard',f"{H.get('R')} vs {home_runs}")
    ck('pass' if n(A.get('R'))==away_runs else 'warn','Visitor batting runs vs scoreboard',f"{A.get('R')} vs {away_runs}")
    ck('pass' if n(HP.get('R'))==away_runs else 'warn','Home pitching R vs opponent scoreboard',f"R={HP.get('R')}, ER={HP.get('ER')}, scoreboard={away_runs}")
    ck('pass' if n(AP.get('R'))==home_runs else 'warn','Visitor pitching R vs opponent scoreboard',f"R={AP.get('R')}, ER={AP.get('ER')}, scoreboard={home_runs}")
    active=sorted({r['Name'] for r in hb+ab if active_bat(r)}|{r['Name'] for r in hp+ap if active_pit(r)})
    if known_players:
        unknown=[x for x in active if x not in known_players];ck('error' if unknown else 'pass','Player database match',', '.join(unknown) if unknown else f'{len(active)} recognized')
    for r in s:
        if not blank(r.get('save_pitcher')) and r.get('save_pitcher')==r.get('winning_pitcher'):ck('warn',f"Game {r.get('game')}: WP also listed as SV",r.get('winning_pitcher'))
    for p,g in gp_overrides.items():
        if p not in active:ck('error','GP override player inactive',p)
        if g not in (1,2):ck('error','GP override must be 1 or 2',f'{p}: {g}')
    return {'checks':checks,'active_players':active,'ignored_zero_pa':sorted({r['Name'] for r in hb+ab if r.get('Name') not in ('TOTALS','') and not active_bat(r)}),'series':s}
if __name__=='__main__':
    ap=argparse.ArgumentParser();
    for a in ['home_bat','home_pit','away_bat','away_pit','series']:ap.add_argument(a)
    ap.add_argument('--out',default='validation_report.json');args=ap.parse_args()
    result=run(args.home_bat,args.home_pit,args.away_bat,args.away_pit,args.series);Path(args.out).write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
