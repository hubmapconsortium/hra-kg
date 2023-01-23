
# Class: SpatialEntity




URI: [ccf:SpatialEntity](http://purl.org/ccf/SpatialEntity)


[![img](https://yuml.me/diagram/nofunky;dir:TB/class/[SpatialPlacement],[SpatialObjectReference],[SpatialPlacement]<placements%200..*-++[SpatialEntity&#124;id:string;label:string;creator:string;creator_first_name:string;creator_last_name:string;creator_orcid:string%20%3F;creation_date:string;x_dimension:decimal;y_dimension:decimal;z_dimension:decimal;dimension_unit:string;representation_of:string%20%3F;organ_owner_sex:string%20%3F;organ_side:string%20%3F],[SpatialObjectReference]<object_reference%200..1-++[SpatialEntity],[Container]++-%20data%200..*>[SpatialEntity],[SpatialPlacement]-%20source%200..1>[SpatialEntity],[SpatialPlacement]-%20target%201..1>[SpatialEntity],[Container])](https://yuml.me/diagram/nofunky;dir:TB/class/[SpatialPlacement],[SpatialObjectReference],[SpatialPlacement]<placements%200..*-++[SpatialEntity&#124;id:string;label:string;creator:string;creator_first_name:string;creator_last_name:string;creator_orcid:string%20%3F;creation_date:string;x_dimension:decimal;y_dimension:decimal;z_dimension:decimal;dimension_unit:string;representation_of:string%20%3F;organ_owner_sex:string%20%3F;organ_side:string%20%3F],[SpatialObjectReference]<object_reference%200..1-++[SpatialEntity],[Container]++-%20data%200..*>[SpatialEntity],[SpatialPlacement]-%20source%200..1>[SpatialEntity],[SpatialPlacement]-%20target%201..1>[SpatialEntity],[Container])

## Referenced by Class

 *  **None** *[➞data](container__data.md)*  <sub>0..\*</sub>  **[SpatialEntity](SpatialEntity.md)**
 *  **None** *[source](source.md)*  <sub>0..1</sub>  **[SpatialEntity](SpatialEntity.md)**
 *  **None** *[target](target.md)*  <sub>1..1</sub>  **[SpatialEntity](SpatialEntity.md)**

## Attributes


### Own

 * [id](id.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [label](label.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [creator](creator.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [creator_first_name](creator_first_name.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [creator_last_name](creator_last_name.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [creator_orcid](creator_orcid.md)  <sub>0..1</sub>
     * Range: [String](types/String.md)
 * [creation_date](creation_date.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [x_dimension](x_dimension.md)  <sub>1..1</sub>
     * Range: [Decimal](types/Decimal.md)
 * [y_dimension](y_dimension.md)  <sub>1..1</sub>
     * Range: [Decimal](types/Decimal.md)
 * [z_dimension](z_dimension.md)  <sub>1..1</sub>
     * Range: [Decimal](types/Decimal.md)
 * [dimension_unit](dimension_unit.md)  <sub>1..1</sub>
     * Range: [String](types/String.md)
 * [representation_of](representation_of.md)  <sub>0..1</sub>
     * Range: [String](types/String.md)
 * [organ_owner_sex](organ_owner_sex.md)  <sub>0..1</sub>
     * Range: [String](types/String.md)
 * [organ_side](organ_side.md)  <sub>0..1</sub>
     * Range: [String](types/String.md)
 * [object_reference](object_reference.md)  <sub>0..1</sub>
     * Range: [SpatialObjectReference](SpatialObjectReference.md)
 * [placements](placements.md)  <sub>0..\*</sub>
     * Range: [SpatialPlacement](SpatialPlacement.md)

## Other properties

|  |  |  |
| --- | --- | --- |
| **Mappings:** | | ccf:SpatialEntity |

