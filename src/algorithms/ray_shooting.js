/**
 * @module RayShoot
 */
"use strict";
import {EQ, EQ_0, GT, LT} from '../utils/utils';
import Errors from '../utils/errors';
import {INSIDE, OUTSIDE, BOUNDARY} from '../utils/constants';

import {Ray} from '../classes/ray'
import {Line} from '../classes/line'
import {Segment} from '../classes/segment'

/**
 * Implements ray shooting algorithm. Returns relation between point and polygon: inside, outside or boundary
 * @param {Polgon} polygon - polygon to test
 * @param {Point} point - point to test
 * @returns {Flatten.Inside|Flatten.OUTSIDE|Flatten.Boundary}
 */
export function ray_shoot(polygon, point) {
    let contains = undefined;

    // if (!(polygon instanceof Polygon && point instanceof Point)) {
    //     throw Errors.ILLEGAL_PARAMETERS;
    // }

    // 1. Quick reject
    if (polygon.box.not_intersect(point.box)) {
        return OUTSIDE;
    }

    let ray = new Ray(point);
    let line = new Line(ray.pt, ray.norm);

    // 2. Locate relevant edges of the polygon
    let resp_edges = polygon.edges.search(ray.box);

    if (resp_edges.length == 0) {
        return OUTSIDE;
    }

    // 3. Calculate intersections
    let intersections = [];
    for (let edge of resp_edges) {
        for (let ip of ray.intersect(edge.shape)) {

            // If intersection is equal to query point then point lays on boundary
            if (ip.equalTo(point)) {
                return BOUNDARY;
            }

            intersections.push({
                pt: ip,
                edge: edge
            });
        }
    }

    // 4. Sort intersection in x-ascending order
    intersections.sort((i1, i2) => {
        if (LT(i1.pt.x, i2.pt.x)) {
            return -1;
        }
        if (GT(i1.pt.x, i2.pt.x)) {
            return 1;
        }
        return 0;
    });

    // 5. Count real intersections, exclude touching
    let counter = 0;

    for (let i = 0; i < intersections.length; i++) {
        let intersection = intersections[i];
        if (intersection.pt.equalTo(intersection.edge.shape.start)) {
            /* skip same point between same edges if already counted */
            if (i > 0 && intersection.pt.equalTo(intersections[i - 1].pt) &&
                intersection.edge.prev === intersections[i - 1].edge) {
                continue;
            }
            let prev_edge = intersection.edge.prev;
            while (EQ_0(prev_edge.length)) {
                prev_edge = prev_edge.prev;
            }
            let prev_tangent = prev_edge.shape.tangentInEnd();
            let prev_point = intersection.pt.translate(prev_tangent);

            let cur_tangent = intersection.edge.shape.tangentInStart();
            let cur_point = intersection.pt.translate(cur_tangent);

            let prev_on_the_left = prev_point.leftTo(line);
            let cur_on_the_left = cur_point.leftTo(line);

            if ((prev_on_the_left && !cur_on_the_left) || (!prev_on_the_left && cur_on_the_left)) {
                counter++;
            }
        } else if (intersection.pt.equalTo(intersection.edge.shape.end)) {
            /* skip same point between same edges if already counted */
            if (i > 0 && intersection.pt.equalTo(intersections[i - 1].pt) &&
                intersection.edge.next === intersections[i - 1].edge) {
                continue;
            }
            let next_edge = intersection.edge.next;
            while (EQ_0(next_edge.length)) {
                next_edge = next_edge.next;
            }
            let next_tangent = next_edge.shape.tangentInStart();
            let next_point = intersection.pt.translate(next_tangent);

            let cur_tangent = intersection.edge.shape.tangentInEnd();
            let cur_point = intersection.pt.translate(cur_tangent);

            let next_on_the_left = next_point.leftTo(line);
            let cur_on_the_left = cur_point.leftTo(line);

            if ((next_on_the_left && !cur_on_the_left) || (!next_on_the_left && cur_on_the_left)) {
                counter++;
            }
        } else {        /* intersection point is not a coincident with a vertex */
            if (intersection.edge.shape instanceof Segment) {
                counter++;
            } else {
                /* Check if ray does not touch the curve in the extremal (top or bottom) point */
                let box = intersection.edge.shape.box;
                if (!(EQ(intersection.pt.y, box.ymin) ||
                    EQ(intersection.pt.y, box.ymax))) {
                    counter++;
                }
            }
        }
    }

    // 6. Odd or even?
    contains = counter % 2 == 1 ? INSIDE : OUTSIDE;

    return contains;
};
