import DB from './DB';
import { counter } from './helpers';

const getIntersectingFeatures = (discard_ft_from_already_used = true) => {
  // Get the category of the current
  /* eslint-disable no-nested-ternary */
  const discard_category = discard_ft_from_already_used
    ? State.clues
      .map((d) => (
        d.target.category
          ? d.target.category
          : d.target.feature && d.target.feature.properties.CHOUCAS_CLASS
            ? d.target.feature.properties.CHOUCAS_CLASS
            : null))
      .filter((d) => d)
    : [];
  /* eslint-enable no-nested-ternary */
  const _all_zlp_geojson = Object.keys(DB)
    .filter((n) => n.indexOf('zlp_') > -1)
    .map((d) => DB[d])
    .reduce((acc, current_value) => acc.concat(current_value), [])
    .map((d) => d.geometry);
  // Get the ZLP as a collection pf Polygon (instead of as a MultiPolygon..)
  const all_zlp_geojson_single_poly = [];
  _all_zlp_geojson.forEach((geom) => {
    // if (!geom.type) {
    //   console.log('Unexpected error ...');
    // } else
    if (geom.type === 'Polygon') {
      all_zlp_geojson_single_poly.push(geom);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly_coords) => {
        all_zlp_geojson_single_poly.push({
          type: 'Polygon',
          coordinates: poly_coords,
        });
      });
    }
  });
  const all_ref_layers = Object.keys(DB)
    .filter((n) => n.indexOf('ref_') > -1 && discard_category.indexOf(n.replace('ref_', '')) < 0)
    .map((d) => DB[d]);
  const all_ref_ft = all_ref_layers.reduce(
    (acc, current_value) => acc.concat(current_value), [],
  );

  const form_data = new FormData();
  form_data.append('geoms1', JSON.stringify(all_zlp_geojson_single_poly));
  form_data.append('geoms2', JSON.stringify(all_ref_ft.map((d) => d.geometry)));
  return fetch('/intersects', {
    method: 'POST',
    body: form_data,
  }).then((table_res) => table_res.json())
    .then((table_res) => {
      const intersecting_features_per_zlp = Object.keys(table_res)
        .map((k_zlp) => {
          const zlp_frag_geom = all_zlp_geojson_single_poly[+k_zlp];
          const intersecting_features = Object.keys(table_res[k_zlp])
            .map((k_ft) => (table_res[k_zlp][k_ft] === true ? all_ref_ft[k_ft] : null))
            .filter((d) => d);
          const category_count = counter(intersecting_features
            .map((d) => d.properties.CHOUCAS_CLASS));

          return {
            zlp_frag_geom,
            intersecting_features,
            category_count,
          };
        });
      return intersecting_features_per_zlp;
      // const intersecting_features = Object.keys(table_res)
      //   .map((k_zlp) => {
      //     const x = Object.keys(table_res[k_zlp])
      //       .map(k_ft => (table_res[k_zlp][k_ft] === true ? all_ref_ft[k_ft] : null))
      //       .filter(d => d);
      //     return x;
      //   })
      //   .reduce((acc, current_value) => acc.concat(current_value), []);
      // return intersecting_features;
    });
};

export default getIntersectingFeatures;
