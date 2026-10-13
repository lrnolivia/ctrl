import {TelemetryMosaic} from './TelemetryMosaic';
import type {DashboardSnapshot} from '../types';
export function PageTelemetry({snapshot}:{snapshot:DashboardSnapshot|null;kind:'runner'}){
 return <TelemetryMosaic snapshot={snapshot} variant="runner"/>;
}
