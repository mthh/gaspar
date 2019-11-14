import Ajv from 'ajv';
import schemaISA from '../json/gaspar-ISA.schema.json';
import schemaZLP from '../json/gaspar-ZLP.schema.json';
import schemaClue from '../json/gaspar-clue.schema.json';
import schemaVictim from '../json/gaspar-victim.schema.json';

const ajv = new Ajv();

export default function prepareValidators() {
  return Promise.all([
    fetch('https://geojson.org/schema/Geometry.json').then((r) => r.json()),
    fetch('https://geojson.org/schema/Feature.json').then((r) => r.json()),
  ]).then(([geometry_schema, feature_schema]) => {
    ajv.addSchema(geometry_schema);
    ajv.addSchema(feature_schema);
    return {
      isa: ajv.compile(schemaISA),
      zlp: ajv.compile(schemaZLP),
      clue: ajv.compile(schemaClue),
      victim: ajv.compile(schemaVictim),
    };
  });
}
