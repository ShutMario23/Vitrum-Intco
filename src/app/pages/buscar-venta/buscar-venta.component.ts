import { Component, ViewChild, OnInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { ColorThemeService } from 'src/app/services/color-theme.service';
import { MatDialog } from '@angular/material/dialog';
import { VentaService } from 'src/app/api/venta/venta.service';
import { IVenta } from 'src/app/models/IVenta';
import { ClienteService } from 'src/app/api/cliente/cliente.service';
import { ICliente } from 'src/app/models/ICliente';
import { ConfirmarEliminarComponent } from 'src/app/shared/confirmar-eliminar/confirmar-eliminar.component';
import { SnackBarService } from 'src/app/services/snack-bar.service';
import { ICotizacion } from 'src/app/models/ICotizacion';
import { CotizacionService } from 'src/app/api/cotizacion/cotizacion.service';
import { EditarVentaComponent } from 'src/app/pages/buscar-venta/editar-venta/editar-venta.component';

export interface tablaVentas {
  id: number,
  nombre_cliente: string,
  fecha: Date,
  estado: string,
  total: number
}

@Component({
  selector: 'app-buscar-venta',
  templateUrl: './buscar-venta.component.html',
  styleUrls: ['./buscar-venta.component.css'],
  providers: [
    { provide: MatPaginatorIntl, useValue: CustomPaginator() }  // Here
  ]
})
export class BuscarVentaComponent implements OnInit {

  color = 'primary';
  public actualTheme: string;
  dark = 'dark';
  light = 'light';
  public colorMode: string;
  private COTIZACIONES: ICotizacion[];
  private CLIENTES: ICliente[];
  private VENTAS: IVenta[];
  private datosTabla: tablaVentas[] = [];

  displayedColumns: string[] = ['id', 'nombre', 'fecha', 'estado', 'total', 'editar', 'eliminar'];
  dataSource: MatTableDataSource<tablaVentas>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    public colorThemeService: ColorThemeService,
    public dialog: MatDialog,
    private cotizacionService: CotizacionService,
    private clienteService: ClienteService,
    private ventaService: VentaService,
    public snackBarService: SnackBarService
  ) {

    this.iniciarDatos();


    this.colorThemeService.theme.subscribe((theme) => {
      this.actualTheme = theme;
      this.viewColor();
    });
  }

  ngOnInit(): void {

  }

  iniciarDatos() {
    this.ventaService.obtenerVentasGet().subscribe(ventas => {
      this.VENTAS = ventas;
      this.cotizacionService.obtenerCotizacionesGet().subscribe(cotizaciones => {
        this.COTIZACIONES = cotizaciones;
        this.clienteService.obtenerClientesGet().subscribe(clientes => {
          this.CLIENTES = clientes;
  
          this.datosTabla = [];
  
          for (let i = 0; i < this.VENTAS.length; i++) {
              this.datosTabla.push({
                nombre_cliente: this.buscarClientePorID(this.COTIZACIONES[i].id_cliente).nombre,
                // estado: this.VENTAS[i].estado,
                estado: this.VENTAS[i].estado,
                fecha: this.VENTAS[i].createdAt,
                id: this.VENTAS[i].id,
                total: this.COTIZACIONES[i].total
              });
          }
  
          this.dataSource = new MatTableDataSource(this.datosTabla);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      });
    })

  }

  buscarClientePorID(id: number): ICliente {
    return this.CLIENTES.find(cliente => cliente.id === id)
  }

  viewColor() {
    if (this.actualTheme.includes(this.dark)) {
      this.colorMode = this.dark;
    }
    if (this.actualTheme.includes(this.light)) {
      this.colorMode = this.light;
    }
    console.log(this.colorMode);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onDelete(venta: IVenta) {
    let ven = this.VENTAS.find(vent => vent.id === venta.id);
    const dialogRef = this.dialog.open(ConfirmarEliminarComponent, {
      data: 'Venta',
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result.res) {
        this.ventaService.eliminarVentaDelete(ven).subscribe(res => {
          this.snackBarService.greenSnackBar('Se ha eliminado la Venta');
          this.iniciarDatos();
          this.onDeleteCotizacion(ven.id_cotizacion);
        });
      } else {
        this.snackBarService.redSnackBar('Eliminaci??n cancelada');
        console.log(`Exit on click outside`);
      }
    });
  }

  onDeleteCotizacion(idCot: number){
    this.cotizacionService.obtenerCotizacionesGet().subscribe(cotizaciones => {
      this.COTIZACIONES = cotizaciones;
      let cotizacionesCliente = this.COTIZACIONES.filter(cotizacion => cotizacion.id === idCot);
      for (let i = 0; i < cotizacionesCliente.length; i++){
        this.cotizacionService.eliminarCotizacionDelete(cotizacionesCliente[i]).subscribe(res => {
        });
      }
    });
  }
  
  editarCotizacion(venta: IVenta) {
    let ven = this.VENTAS.find(vent => vent.id === venta.id);
    const dialogRef = this.dialog.open(EditarVentaComponent, {
      autoFocus: false,
      data: ven
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.res === "realizada") {
          this.iniciarDatos();
        }
      } else {
        console.log(`Exit on click outside`);
      }
    });
  }

}

function CustomPaginator() {
  const customPaginatorIntl = new MatPaginatorIntl();
  customPaginatorIntl.itemsPerPageLabel = 'Registros por p??gina:';
  customPaginatorIntl.previousPageLabel = 'P??gina anterior'
  customPaginatorIntl.nextPageLabel = 'P??gina siguiente';
  customPaginatorIntl.getRangeLabel = (page: number, size: number, length: number): string => {
    length = Math.max(length, 0);
    const startIndex = page * size;
    // If the start index exceeds the list length, do not try and fix the end index to the end.
    const endIndex = startIndex < length ? Math.min(startIndex + size, length) : startIndex + page;
    return `${startIndex + 1} - ${endIndex} de ${length} registros`;
  };
  return customPaginatorIntl;
}
