import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { ServersService } from './servers.service.js';
import { CreateServerDto } from './dto/create-server.dto.js';
import { UpdateServerDto } from './dto/update-server.dto.js';

@ApiTags('servers')
@ApiSecurity('AdminApiKey')
@UseGuards(ApiKeyGuard)
@Controller('admin/servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new downstream MCP server' })
  @ApiResponse({ status: 201, description: 'Server created successfully' })
  @ApiResponse({ status: 409, description: 'Alias already exists' })
  create(@Body() dto: CreateServerDto) {
    return this.serversService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all downstream MCP servers' })
  findAll() {
    return this.serversService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single MCP server by ID' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a MCP server record' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServerDto,
  ) {
    return this.serversService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a MCP server record' })
  @ApiResponse({ status: 204, description: 'Server deleted' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.remove(id);
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a server' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  enable(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.setEnabled(id, true);
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a server' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  disable(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.setEnabled(id, false);
  }
}
