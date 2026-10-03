export type ChinaDistrict={code:string;name:string;aliases?:string[];kind:'county'|'statistical'|'township'|'district'|'geographic'};
export type ChinaCity={code:string;name:string;aliases?:string[];kind:'municipality'|'direct'|'city'|'county-city'|'special';districts:ChinaDistrict[]};
export type ChinaRegion={code:string;name:string;cities:ChinaCity[]};
export type ChinaDirectory={version:1;mainlandAsOf:string;taiwanSnapshot:string;regions:ChinaRegion[]};
export const regionCities=(directory:ChinaDirectory|undefined,province:string)=>directory?.regions.find(r=>r.name===province)?.cities||[];
export const cityDistricts=(directory:ChinaDirectory|undefined,province:string,city:string)=>regionCities(directory,province).find(c=>c.name===city)?.districts||[];
