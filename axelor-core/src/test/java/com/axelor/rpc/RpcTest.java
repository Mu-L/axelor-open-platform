/*
 * Axelor Business Solutions
 *
 * Copyright (C) 2005-2025 Axelor (<http://axelor.com>).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
package com.axelor.rpc;

import com.axelor.JpaTest;
import com.axelor.common.ResourceUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStreamReader;
import javax.inject.Inject;

abstract class RpcTest extends JpaTest {

  @Inject protected ObjectMapper mapper;

  protected InputStreamReader read(String json) {
    return new InputStreamReader(ResourceUtils.getResourceStream("json/" + json));
  }

  protected String toJson(Object value) {
    try {
      return mapper.writeValueAsString(value);
    } catch (Exception e) {
      throw new IllegalArgumentException(e);
    }
  }

  protected <T> T fromJson(InputStreamReader reader, Class<T> klass) {
    try {
      return mapper.readValue(reader, klass);
    } catch (Exception e) {
      throw new IllegalArgumentException(e);
    }
  }

  protected <T> T fromJson(String json, Class<T> klass) {
    if (json.endsWith(".json")) return fromJson(read(json), klass);
    try {
      return mapper.readValue(json, klass);
    } catch (Exception e) {
      throw new IllegalArgumentException(e);
    }
  }
}
